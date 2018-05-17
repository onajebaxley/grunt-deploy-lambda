'use strict';

/**
 * grunt-deploy-lambda
 * https://github.com/onajebaxley/grunt-deploy-lambda
 *
 * Copyright (C) 2018 Onaje K.S. Baxley
 * Licensed under the MIT license.
 */

// Here's an example environment sourceFile for update_lambda_environment task; It exports an object
// whose key/value pairs will be deeply flattened and sent to your Lambda function as environment variables.
//
// NOTE: Because these will end up as env variables in your lambda, only key/values of strings are valid.
//
// NOTE: This is NOT the only way to format a sourcefile, please see alternateEnv.js for an example on
// how to make a more complex configuration where key-vals are dynamically determined via function calls.
const envVariables = {
    someKey1: 'key1Value',
    someKey2: 'key2Value',
    nestedObject: {
        nestedKey: 'nestedValue',
        nestedKey2: 'nestedValue2'
    },
    anotherNestedObject: {
        doublyNestedObject: {
            // once in your lambda, below would have the env key: anotherNestedObject_doublyNestedObject_doublyNestedKey
            doublyNestedKey: 'doublyNestedValue'
        }
    }
};

module.exports = envVariables;

