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
        let awsProfile = process.env.AWS_PROFILE;
        let credentials = {};

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

        grunt.log.debug(`Using S3 bucket: ${bucketName}`);
        grunt.log.debug(`Using S3 packagePath: ${packagePath}`);
        grunt.log.debug(`Using Lambda function ARN: ${functionArn}`);

        const done = this.async();
        const s3 = new AWS.S3({ credentials: credentials });
        const lambda = new AWS.Lambda({ credentials: credentials, region: functionArn.split(':')[3], apiVersion: '2015-03-31' });

        var listBucketObjects  = () => { return new Promise((resolve, reject) => {
            s3.listObjectsV2({
              Bucket: bucketName
            }, (err, data) => {
              if (err) {
                grunt.log.error(`Unable to extract AWS info for bucket: ${bucketName}`);
                return reject(err);
              }

              let message = `Returned S3 bucket data: ${JSON.stringify(data)}`;
              grunt.log.debug(message);
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

        grunt.log.writeln(`Fetching S3 bucket objects for ${bucketName}...`);

        listBucketObjects().then((res) => {
            let packageExists = false;
            res.Contents.forEach((bucketObject) => {
                packageExists = packageExists || bucketObject.Key === packagePath;
            });

            if (!packageExists) {
                let err = `Targeted package "${packagePath}" not found in S3 bucket "${bucketName}"`;
                grunt.fail.warn(err);
                return done(false);
            }

            grunt.log.writeln(`Package found in S3.\nPerforming function code update...`);

            return updateFunctionCode();
        }).then((res) => {
            grunt.log.debug('API call updateFunctionCode resolved.');

            if (res) grunt.log.writeln('Package successfully deployed.');
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

