'use strict';

/*
 * grunt-deploy-lambda
 * https://github.com/onajebaxley/grunt-deploy-lambda
 *
 * Copyright (C) 2018 Onaje K.S. Baxley
 * Licensed under the MIT license.
 */

const updateLambdaEnvTask = require('../utils/update_lambda_env');

module.exports = function(grunt) {

    // Please see the Grunt docs for more info on task creation: https://gruntjs.com/creating-tasks
    grunt.registerTask('update_lambda_environment',
        'Updates the specified AWS Lambda function with new environment variables',
        updateLambdaEnvTask.getHandler(grunt));
};

