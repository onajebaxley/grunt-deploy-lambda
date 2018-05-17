'use strict';

const path = require('path');
const AWS = require('aws-sdk');
var Promise = require('bluebird').Promise;
var assignDeep = require('assign-deep');
var flatten = require('flat');

/**
 * grunt-deploy-lambda
 * https://github.com/onajebaxley/grunt-deploy-lambda
 *
 * Copyright (C) 2018 Onaje K.S. Baxley
 * Licensed under the MIT license.
 */

const updateLambdaEnvTask = {};

/////////////////
//   Helpers   //
/////////////////

function getInvalidConfigMsg(configStr, specifyHelper) {
    if (specifyHelper) {
        return `Invalid ${configStr} configuration; Please specify ${specifyHelper}.`;
    } else {
        return `Invalid ${configStr} configuration; Please initialize it.`;
    }
}

function resolvePath(filepath) {
    let tildeIndex = filepath.indexOf('~');

    if (tildeIndex < 0) {
        return filepath;
    } else if (tildeIndex === 0) {
        return path.join(process.env.HOME, filepath.slice(1));
    } else {
        throw new Error(`Invalid filepath ${filepath}`);
    }
}

function uploadEnvVariables(envVariablesObj, functionArn, lambdaApi, grunt, done) {
    // flatten the object containing env variables to be one level deep, nested object-keys will be preceeded by "_"
    let flattened = flatten(envVariablesObj, { delimiter: '_' });
    let lambdaConfigParams = { Environment: { Variables: flattened } };

    var getLambdaFunction = (deploy_function) => { return new Promise((resolve, reject) => {
        lambdaApi.getFunction({
            FunctionName: deploy_function
        }, (err, data) => {
          if (err) {
              if (err.statusCode === 404) {
                  grunt.fail.warn('Unable to find lambda function ' + deploy_function + ', verify the lambda function name and AWS region are correct.');
              } else {
                  grunt.log.error('AWS API request failed with ' + err.statusCode + ' - ' + err);
                  grunt.fail.warn('Check your AWS credentials, region and permissions are correct.');
              }
              return reject(err);
          }

              return resolve(data);
          });
      });
    };

    var updateFunctionConfig = (deploy_function, config_params) => { return new Promise((resolve, reject) => {
        if (Object.keys(config_params).length > 0) {
            config_params.FunctionName = deploy_function;

            lambdaApi.updateFunctionConfiguration(config_params, function (err, data) {
                if (err) {
                    grunt.log.error(err.message);
                    grunt.fail.warn('Could not update config, please check that values and lambda:UpdateFunctionConfiguration perms are correct.');
                    return reject(err);
                } else {
                    grunt.log.writeln('Environment updated.');
                    return resolve(data);
                }
            });
        } else {
            grunt.log.writeln('No config updates to make.');
            return resolve();
        }
      });
    };

    grunt.log.writeln(`Fetching lambda function ${functionArn}...`);

    getLambdaFunction(functionArn).then((res) => {
        if (res) grunt.log.writeln(`Function found in AWS Lambda.\nPerforming function environment update...`);

        return updateFunctionConfig(functionArn, lambdaConfigParams);
    }).then((res) => {
        
        return done();
    }).catch((err) => {
        grunt.fail.warn(`Unable to perform update_lambda_environment`);
        return done(false);
    });
}


////////////////////
//   Task Root    //
////////////////////

updateLambdaEnvTask.getHandler = function(grunt) {
    return function(target) {
        if (typeof target !== 'string' || target.length <= 0) {
            // Use the default target name
            target = 'default';
        }
        grunt.log.writeln(`Using target configuration: ${target}`);
        grunt.config.requires(`update_lambda_environment.${target}`);

        let functionArn = grunt.config.get(`update_lambda_environment.${target}.functionArn`);
        let envFilePath = grunt.config.get(`update_lambda_environment.${target}.envFilePath`);
        let awsProfile = process.env.AWS_PROFILE;
        let credentials = {};

        // Resolve the desired AWS profile in this order: env variables, CLI options, task config, and finally the "default" ~/.aws/credentials profile
        if (!awsProfile || awsProfile.length <= 0) {
            let awsProfileName = grunt.option('aws-profile') || 'conf';

            if (awsProfileName != 'conf') { // CLI profile option specified
                grunt.log.debug(`Using CLI specified AWS profile: ${awsProfileName}`);
                credentials = new AWS.SharedIniFileCredentials({ profile: awsProfileName });
            } else { // try loading from target task configuration, if that fails default to 'default' profile in ~/.aws/credentials
                awsProfileName = grunt.config.get(`update_lambda_environment.${target}.options.awsProfile`) || grunt.config.get(`update_lambda_environment.default.options.awsProfile`);

                if (!awsProfileName || typeof awsProfileName != 'string' || awsProfileName.length <= 0) {
                    awsProfileName = 'default';
                }

                grunt.log.debug(`Using config specified AWS profile: ${awsProfileName}`);
                credentials = new AWS.SharedIniFileCredentials({ profile: awsProfileName });
            }
        } else {
            grunt.log.debug(`Using env variable AWS_PROFILE as AWS credentials`);
            credentials = new AWS.SharedIniFileCredentials({ profile: awsProfile });
        }

        if (typeof functionArn !== 'string' || functionArn.length <= 0) {
            // Use the function ARN set by the default task.
            grunt.config.requires('update_lambda_environment.default.functionArn');
            functionArn = grunt.config.get('update_lambda_environment.default.functionArn');
            if (typeof functionArn !== 'string' || functionArn.indexOf(':') < 0) {
                grunt.fail.warn(getInvalidConfigMsg('update_lambda_environment.default.functionArn', 'string of the Lambda function ARN to deploy to'));
            }
            grunt.log.writeln(`Setting default functionArn: ${functionArn}`);
        }

        if (typeof envFilePath !== 'string' || envFilePath.length <= 0) {
            // Use the environemnt source file path set by the default task
            grunt.config.requires(`update_lambda_environment.default.envFilePath`);
            envFilePath = grunt.config.get('update_lambda_environment.default.envFilePath');
            if (typeof envFilePath !== 'string' || envFilePath.indexOf('.js') < 0) {
                grunt.fail.warn(getInvalidConfigMsg('update_lambda_environment.default.envFilePath', 'string of the relative path to your environment source JS file'));
            }
            grunt.log.writeln(`Setting default envFilePath: ${envFilePath}`);
        }

        envFilePath = resolvePath(envFilePath);

        grunt.log.debug(`Using Lambda function ARN: ${functionArn}`);
        grunt.log.debug(`Using environment source file: ${envFilePath}`);
        
        const environmentSource = require(envFilePath);
        const done = this.async();
        const lambdaApi = new AWS.Lambda({ credentials: credentials, region: functionArn.split(':')[3], apiVersion: '2015-03-31' });

        let envVariables = {};

        if (Array.isArray(environmentSource)) {
            grunt.log.debug('Detected an array-type environment file');
            var promises = [];

            // Iterate through each function and promisify (if applicable)
            for (let i = 0; i < environmentSource.length; i++) {
                promises.push(Promise.try(environmentSource[i]));
            }

            // Process and merge the results of each promise in their respective order, overwriting previous assignments on the same key
            Promise.each(promises, (value, index, length) => {
                grunt.log.debug(`Recevied value from func ${index + 1}: ${JSON.stringify(value)}`);
                assignDeep(envVariables, value);

                if (index === length - 1) {
                    grunt.log.writeln(`Resulting merged object: ${JSON.stringify(envVariables)}`);
                    uploadEnvVariables(envVariables, functionArn, lambdaApi, grunt, done);
                }
            });
        } else {
            grunt.log.debug('Detected an object-type environment file');
            envVariables = environmentSource;

            uploadEnvVariables(envVariables, functionArn, lambdaApi, grunt, done);
        }

    };
};

module.exports = updateLambdaEnvTask;

