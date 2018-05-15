'use strict';

/**
 * grunt-deploy-lambda
 * https://github.com/onajebaxley/grunt-deploy-lambda
 *
 * Copyright (C) 2018 Onaje K.S. Baxley
 * Licensed under the MIT license.
 */

const deployFromS3Task = require('../utils/deploy_from_s3');

module.exports = function(grunt) {
    grunt.initConfig({
        /**
         * Configuration for @onaje/grunt-deploy-lambda, which is used to:
         *  - Upload/deploy newly packaged lambda function code from S3 bucket
         */
        deploy_lambda_from_s3: {
            default: {
                packagePath: 'cf-tutorial_0-0-1_2018-4-11-12-53-4.zip',
                bucket: 'my-default-s3-bucket',
                functionArn: 'arn:aws:lambda:us-east-1:5555555:function:myDefaultLambda',
                options: {
                    awsProfile: 'default'
                }
            },
            alternate: {
                packagePath: 'some/path/to/overriding_package.zip',
                bucket: 'takes-presedence-over-default-bucket',
                //functionArn: 'commented out--will fall back to default.functionArn',
                options: {
                    awsProfile: 'sandbox'
                }
            }
        }
    });

    // Please see the Grunt docs for more info on task creation: https://gruntjs.com/creating-tasks
    grunt.registerTask('test_deploy',
        'Tests uploading the specified package as AWS Lambda function code',
        deployFromS3Task.getHandler(grunt));
};

