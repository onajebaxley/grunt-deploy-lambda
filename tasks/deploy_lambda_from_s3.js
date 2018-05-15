'use strict';

/*
 * grunt-deploy-lambda
 * https://github.com/onajebaxley/grunt-deploy-lambda
 *
 * Copyright (C) 2018 Onaje K.S. Baxley
 * Licensed under the MIT license.
 */

const deployFromS3Task = require('../utils/deploy_from_s3');

module.exports = function(grunt) {

    // Please see the Grunt docs for more info on task creation: https://gruntjs.com/creating-tasks
    grunt.registerTask('deploy_lambda_from_s3',
        'Uploads the specified package as AWS Lambda function code',
        deployFromS3Task.getHandler(grunt));
};

