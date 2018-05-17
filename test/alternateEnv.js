'use strict'

/**
 * grunt-deploy-lambda
 * https://github.com/onajebaxley/grunt-deploy-lambda
 *
 * Copyright (C) 2018 Onaje K.S. Baxley
 * Licensed under the MIT license.
 */

// Here's another example environment source file. Unlike defaultEnv.js, this one exports an array of
// functions where each function returns an object (or a Promise resolving to an object) containing
// some key/value pairs. Again, the returned object values MUST be strings as they will eventually
// become lambda environment variables, and at this time AWS only supports strings.
//
// The functions will be executed in order starting at index 0, where each function's key-values will be merged with the former. 
// Latter values may overwrite values from previously-executed functions if multiple functions return references to the same key. The
// resulting merge of all key-value pairs across all functions will then be sent as the environment variables to your Lambda.
const arrayOfEnvFunctions = [
    () => {
        setTimeout(() => { console.log('Timeout completed, returning'); }, 3000);
        return { aKey: 'aKeysValue', anotherkey: 'anotherkeyvalue', nestedObj: { aNestedKey: 'aNestedValue' }, isThisKeyOverriden: 'no' };
    },
    () => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                return resolve({ aPrePromisedKey: 'aPrepromisedValue', nestedObj: { nestedPromiseKey: 'nestedPromise_value' }, isThisKeyOverriden: 'yes' });
            }, 1000);
        });
    },
    () => {
        setTimeout(() => { console.log('Timeout completed, returning2'); }, 6000);
        return { thirdFuncitonKey: 'thirdFunctionKeyVal', nestedObj: { }, anotherNestedObj: { aNestedKey: 'aNestedValueThatShouldntOverwrite', aStrRepresentingAnInt: '456' } };
    }
];

module.exports = arrayOfEnvFunctions;

