'use strict';

const AWS = require('aws-sdk');
var Promise = require('bluebird').Promise;

/**
 * grunt-deploy-lambda
 * https://github.com/onajebaxley/grunt-deploy-lambda
 *
 * Copyright (C) 2018 Onaje K.S. Baxley
 * Licensed under the MIT license.
 */

const deployFromS3Task = {};

deployFromS3Task.getHandler = function(grunt) {
    return function(target) {
        if (typeof target !== 'string' || target.length <= 0) {
            // Use the default target name
            target = 'default';
            grunt.log.writeln(`Using target: ${target}`);
            grunt.config.requires(`deploy_lambda_from_s3.${target}`);
        }

        let bucketName = grunt.config.get(`deploy_lambda_from_s3.${target}.bucket`);
        let packagePath = grunt.config.get(`deploy_lambda_from_s3.${target}.packagePath`);
        let functionArn = grunt.config.get(`deploy_lambda_from_s3.${target}.functionArn`);
        let lambdaConfigOptions = grunt.config.get(`deploy_lambda_from_s3.${target}.lambdaConfigOptions`);
        let awsProfile = process.env.AWS_PROFILE;
        let credentials = {};
        let lambdaConfigParams = {};

        // Resolve the desired AWS profile in this order: env variables, CLI options, task config, and finally the "default" ~/.aws/credentials profile
        if (!awsProfile || awsProfile.length <= 0) {
            let awsProfileName = grunt.option('aws-profile') || 'conf';

            if (awsProfileName != 'conf') { // CLI profile option specified
                grunt.log.debug(`Using CLI specified AWS profile: ${awsProfileName}`);
                credentials = new AWS.SharedIniFileCredentials({ profile: awsProfileName });
            } else { // try loading from target task configuration, if that fails default to 'default' profile in ~/.aws/credentials
                awsProfileName = grunt.config.get(`deploy_lambda_from_s3.${target}.options.awsProfile`) || grunt.config.get(`deploy_lambda_from_s3.default.options.awsProfile`);

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

        if (typeof bucketName !== 'string' || bucketName.length <= 0) {
            // Use the S3 bucket set by the default task.
            grunt.config.requires('deploy_lambda_from_s3.default.bucket');
            bucketName = grunt.config.get('deploy_lambda_from_s3.default.bucket');
            if (typeof bucketName !== 'string' || bucketName.length <= 0) {
                grunt.fail.warn(getInvalidConfigMsg('deploy_lambda_from_s3.default.bucket', 'string representing the name of the S3 bucket'));
            }
            grunt.log.writeln(`Setting default bucket: ${bucketName}`);
        }

        if (typeof packagePath !== 'string' || packagePath.length <= 0) {
            // Use the package path set by the default task.
            grunt.config.requires('deploy_lambda_from_s3.default.packagePath');
            packagePath = grunt.config.get('deploy_lambda_from_s3.default.packagePath');
            if (typeof packagePath !== 'string' || packagePath.indexOf('.zip') < 0) {
                grunt.fail.warn(getInvalidConfigMsg('deploy_lambda_from_s3.default.packagePath', 'string of the path to the zipped package'));
            }
            grunt.log.writeln(`Setting default packagePath: ${packagePath}`);
        }

        if (typeof functionArn !== 'string' || functionArn.length <= 0) {
            // Use the function ARN set by the default task.
            grunt.config.requires('deploy_lambda_from_s3.default.functionArn');
            functionArn = grunt.config.get('deploy_lambda_from_s3.default.functionArn');
            if (typeof functionArn !== 'string' || functionArn.indexOf(':') < 0) {
                grunt.fail.warn(getInvalidConfigMsg('deploy_lambda_from_s3.default.functionArn', 'string of the Lambda function ARN to deploy to'));
            }
            grunt.log.writeln(`Setting default functionArn: ${functionArn}`);
        }

        if (lambdaConfigOptions) {
            if (lambdaConfigOptions.timeout) {
                lambdaConfigParams.Timeout = lambdaConfigOptions.timeout;
            }
            if (lambdaConfigOptions.memory) {
                lambdaConfigParams.MemorySize = lambdaConfigOptions.memory;
            }
            if (lambdaConfigOptions.handler) {
                lambdaConfigParams.Handler = lambdaConfigOptions.handler;
            }
            if (lambdaConfigOptions.role) {
                lambdaConfigParams.Role = lambdaConfigOptions.role;
            }
            if (lambdaConfigOptions.runtime) {
                lambdaConfigParams.Runtime = lambdaConfigOptions.runtime;
            }
            if (lambdaConfigOptions.description) {
                lambdaConfigParams.Description = lambdaConfigOptions.description;
            }
        }

        grunt.log.debug(`Using S3 bucket: ${bucketName}`);
        grunt.log.debug(`Using S3 packagePath: ${packagePath}`);
        grunt.log.debug(`Using Lambda function ARN: ${functionArn}`);
        if (lambdaConfigOptions)
            grunt.log.debug(`Using Lambda Configuration options: ${JSON.stringify(lambdaConfigParams)}`);

        const done = this.async();
        const s3 = new AWS.S3({ credentials: credentials });
        const lambda = new AWS.Lambda({ credentials: credentials, region: functionArn.split(':')[3], apiVersion: '2015-03-31' });

        // listBucketObjects no longer used: replaced with getBucketObject
        var listBucketObjects  = () => { return new Promise((resolve, reject) => {
            s3.listObjectsV2({
              Bucket: bucketName
            }, (err, data) => {
              if (err) {
                grunt.fail.warn(`Unable to extract AWS info for bucket: ${bucketName}`);
                return reject(err);
              }

              let message = `Returned S3 bucket data: ${JSON.stringify(data)}`;
              grunt.log.debug(message);
              return resolve(data);
            });
          });
        };

        var getBucketObject  = () => { return new Promise((resolve, reject) => {
            s3.getObject({
              Bucket: bucketName,
              Key: packagePath
            }, (err, data) => {
              if (err) {
                grunt.fail.warn(`Unable to pull object ${packagePath} from bucket: ${bucketName}`);
                return reject(err);
              }

              let message = `Returned S3 object length: ${data.ContentLength}`;
              grunt.log.debug(message);
              return resolve(data);
            });
          });
        };

        var getLambdaFunction = (deploy_function) => { return new Promise((resolve, reject) => {
            lambda.getFunction({
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

        var updateFunctionCode = () => { return new Promise((resolve, reject) => {
            let codeParams = {
                FunctionName: functionArn,
                S3Bucket: bucketName,
                S3Key: packagePath
            };

            lambda.updateFunctionCode(codeParams, (err, data) => {
                if (err) {
                    grunt.log.error(JSON.stringify(err));
                    grunt.fail.warn('Package upload failed, check you have lambda:UpdateFunctionCode perms and that your package is not too big to upload.');
                    return reject(err);
                }

                return resolve(true);
            });
          });
        };

        var updateFunctionConfig = (deploy_function, config_params) => { return new Promise((resolve, reject) => {
            if (Object.keys(config_params).length > 0) {
                grunt.log.writeln(`Updating Lambda function configuration...`);
                config_params.FunctionName = deploy_function;

                lambda.updateFunctionConfiguration(config_params, function (err, data) {
                    if (err) {
                        grunt.log.error(err.message);
                        grunt.fail.warn('Could not update config, please check that values and lambda:UpdateFunctionConfiguration perms are correct.');
                        return reject(err);
                    } else {
                        grunt.log.writeln('Config updated.');
                        return resolve(data);
                    }
                });
            } else {
                grunt.log.writeln('No config updates to make.');
                return resolve();
            }
          });
        };

        grunt.log.writeln(`Fetching S3 bucket objects for ${bucketName}...`);

        getBucketObject().then((res) => {
            let packageExists = res.ContentLength;

            if (!packageExists) {
                let err = `Targeted package "${packagePath}" not found in S3 bucket "${bucketName}"`;
                grunt.fail.warn(err);
                return done(false);
            }

            grunt.log.writeln(`Package found in S3.\nVerifying existence of AWS Lambda function ${functionArn}...`);

            return getLambdaFunction(functionArn);
        }).then((res) => {
            if (res) grunt.log.writeln(`Function found in AWS Lambda.\nPerforming function code update...`);

            return updateFunctionCode();
        }).then((res) => {
            grunt.log.debug('API call updateFunctionCode resolved.');

            if (res) grunt.log.writeln('Package successfully deployed.');
            return updateFunctionConfig(functionArn, lambdaConfigParams);
        }).then((res) => {
            
            return done();
        }).catch((err) => {
            grunt.fail.warn(`Unable to perform deploy_lambda_from_s3`);
            return done(false);
        });
    };
};

function getInvalidConfigMsg(configStr, specifyHelper) {
    if (specifyHelper) {
        return `Invalid ${configStr} configuration; Please specify ${specifyHelper}.`;
    } else {
        return `Invalid ${configStr} configuration; Please initialize it.`;
    }
}

module.exports = deployFromS3Task;

