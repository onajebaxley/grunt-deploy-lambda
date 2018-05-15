'use strict';

/**
 * grunt-deploy-lambda
 * https://github.com/onajebaxley/grunt-deploy-lambda
 *
 * Copyright (C) 2018 Onaje K.S. Baxley
 * Licensed under the MIT license.
 */

module.exports = function(grunt) {
    grunt.initConfig({
        /**
         * Configuration for @onaje/grunt-deploy-lambda, which is used to:
         *  - Upload/deploy newly packaged lambda function code from S3 bucket
         */
        deploy_lambda_from_s3: {
            default: {
                packagePath: 'cf-tutorial_0-0-1_2018.zip',
                bucket: 'my-default-s3-bucket',
                functionArn: 'arn:aws:lambda:us-east-1:5555555:function:myDefaultLambda',
                options: {
                    awsProfile: 'default'
                }
            }
        }
    });

    grunt.loadTasks('tasks');
};

