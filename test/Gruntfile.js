'use strict';

/**
 * grunt-deploy-lambda
 * https://github.com/onajebaxley/grunt-deploy-lambda
 *
 * Copyright (C) 2018 Onaje K.S. Baxley
 * Licensed under the MIT license.
 */

const deployFromS3Task = require('../utils/deploy_from_s3');
const updateLambdaEnvTask = require('../utils/update_lambda_env');

module.exports = function(grunt) {
    grunt.initConfig({
        /**
         * Configuration for @onaje/grunt-deploy-lambda's deploy_lambda_from_s3 task, which is used to:
         *  - Upload/deploy newly packaged lambda function code from S3 bucket
         */
        deploy_lambda_from_s3: {
            default: {
                packagePath: 'cf-tutorial_0-0-1_2018-4-11-12-53-4.zip',
                bucket: 'my-default-s3-bucket',
                functionArn: 'arn:aws:lambda:us-east-1:5555555:function:myDefaultLambda',
                lambdaConfigOptions: {
                    memory: 128,
                    runtime: 'nodejs',
                    timeout: 3,
                    handler: 'index.handler',
                    role: 'myExecutionRole'
                },
                options: {
                    awsProfile: 'default'
                }
            },
            alternate: {
                packagePath: 'some/path/to/overriding_package.zip',
                bucket: 'takes-presedence-over-default-bucket',
                //functionArn: 'commented out--will fall back to default.functionArn',
                lambdaConfigOptions: {
                    //memory: 256, commented out -- will NOT fall back to default.lambdaConfigOptions.memory
                    runtime: 'nodejs4.3',
                    timeout: 15,
                },
                options: {
                    awsProfile: 'sandbox'
                }
            }
        },

        /**
         * Configuration for grunt-deploy-lambda's update_lambda_environment task, which is used to:
         *  - Upload/deploy programmatically-defined environment variables to your lambda function
         */
        update_lambda_environment: {
            default: {
                functionArn: 'arn:aws:lambda:us-east-1:5555555:function:myDefaultLambda',
                envFilePath: '~/grunt-deploy-lambda/test/defaultEnv.js',
                envVariablePrefix: 'defaultAppConfig_',
                options: {
                    awsProfile: 'default'
                }
            },
            alternate: {
                // envVariablePrefix: 'myapp_', commented out--will NOT fall back to default.envVariablePrefix
                functionArn: 'arn:aws:lambda:us-east-1:5555555:function:anotherLambda',
                //envFilePath: '../test/alternateEnv.js', commented out--will fall back to default.envFilePath
                options: {
                    awsProfile: 'sandbox'
                }
            }
        }
    });

    // Please see the Grunt docs for more info on task creation: https://gruntjs.com/creating-tasks
    grunt.registerTask('test_deploy_lambda',
        'Tests uploading the specified package as AWS Lambda function code',
        deployFromS3Task.getHandler(grunt));

    grunt.registerTask('test_update_lambda_env',
        'Tests updating the specified AWS Lambda function\'s environment variables',
        updateLambdaEnvTask.getHandler(grunt));
};

