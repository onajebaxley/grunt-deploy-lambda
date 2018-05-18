# grunt-deploy-lambda
Grunt plugin tasks for deploying a package stored in S3 to AWS Lambda

Use of this package requires that you have installed the Grunt CLI and package via `npm install grunt`, in addition to this package.

Use of this package also requires a valid grunt configuration (which can be done in code via `grunt.initConfiguration()`), where validity is described with each respective task.

You may access these tasks programmatically after loading package into your grunt via: ~~`grunt.loadNpmTasks('@onaje/grunt-deploy-lambda');`~~
`grunt.loadNpmTasks('grunt-deploy-lambda');`

## Task: deploy_lambda_from_s3:[targetConfiguration] [--aws-profile]
Deploys the specified function-code package from an S3 Bucket to your AWS Lambda function, and optionally updates certain Lambda configuration parameters.
Obviously, this means your function-code package must already be zipped in some S3 bucket to which you have permissions.

example CLI usage: `grunt deploy_lambda_from_s3:default --aws-profile=default`

NOTE: The "--aws-profile" option overries any `options.awsProfile` specified in your target configuration.
Similarly, setting the environment variable `AWS_PROFILE` will override any specified "--aws-profile" option as well as any target configuration.

### deploy_lambda_from_s3: Task Configuration 
To properly configure this task, one must specify at least a `default` task configuration for the following configuration parameters:
 - bucket: string of the S3 bucket containing the desired package
 - packagePath: string of the path to the zipped package within S3 (ex: `"myS3Packages/lambdaFunctionPackage.zip"`)
 - functionArn: string ARN (Amazon Resource Name) of the lambda function to be deployed
 - awsProfile (optional)*[^1]: string of the AWS Profile to use when performing deploy, matching some profile credential within your `~/.aws/credentials`
 - lambdaConfigOptions (optional): object containing optional configuration parameters for the lambda function to be deployed. Unlike other configuration params, failing to specify these per configuration target will **NOT** result in defaults being used. In other words, these will **NOT** fall back to whatever `default.lambdaConfigOptions` you may have set. Your lambda's configuration will simply not be updated.

Below shows an example grunt configuration for two target configs: default (required) and alternate:

    deploy_lambda_from_s3: {
        default: {
            packagePath: 'cf-tutorial_0-0-1_2018-4-11-12-53-4.zip',
            bucket: 'my-default-s3-bucket',
            functionArn: 'arn:aws:lambda:us-east-1:5555555:function:myDefaultLambda',
            lambdaConfigOptions: {
                memory: 128, // MB
                runtime: 'nodejs',
                timeout: 3, // seconds
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
    }

## Task: update_lambda_environment:[targetConfiguration] [--aws-profile]
Enables you to update AWS Lambda functions' environment variables based on an external file (of optional complexity & dynamism).
The external JS file itself MUST export 1 of 2 possible formats:
  1. A plain JavaScript object containing your desired environment key-val pairs. Nesting is allowed; nested object keys will be delimited rc-style with `__` (e.g. `outerObj_innerObjEnvKey`)
  2. An array of functions (or Promises) where each function returns some key-value based object
    * These functions/Promises will be executed sequentially in the order they are defined within the array
    * The key-value objects returned from each function will be deeply-merged on top of previously-returned objects. This means that keys returned from later functions can potentially overwrite keys from previous functions
    * The object resulting from the final merge is the object that will be converted into your Lambda's environment variables
    * Similar to format #1, nested objects are allowed; these nested keys will be delimited rc-style with double underscores (`__`)
Note that regardless of the format you choose, the inevitable objects that are returned must ONLY contain key-value string primitives; at this point in time AWS prohibits env variables in any other format.

example CLI usage: `grunt update_lambda_environment:production --aws-profile=onaje`

NOTE: The "--aws-profile" option overrides any `options.awsProfile` specified in your target configuration.
Similarly, setting the environment variable `AWS_PROFILE` will override any specified "--aws-profile" option as well as any target configuration.

As of v0.5.0, you also have the option of preceding all your environment variables with some prefix `envVariablePrefix`. If not set, this task will not fall back to some `default.envVariablePrefix`; you simply wont have prefixes on your env variables.

### update_lambda_environment: Task Configuration
To properly configure this task, one must specify at least a `default` task configuration for the following config parameters:
 - functionArn: string ARN (Amazon Resource Name) of the lambda function whose environment variables you wish you update
 - envFilePath: string of the absolute or tilde-aliased (~) path to the JavaScript file which generates your environment variables
 - envVariablePrefix (optional): string to precede all your environment variables. Not setting this for a target configuration will NOT fall back to `default.envVariablePrefix`
 - awsProfile[1] (optional)*: string of the AWS Profile to use when performing Lambda env updates, matching some profile credential within your `~/.aws/credentials`

Below shows an example grunt configuration for two target configs: `default` (required) and alternate:

    update_lambda_environment: {
        default: {
            functionArn: 'arn:aws:lambda:us-east-1:5555555:function:myDefaultLambda',
            envFilePath: '~/grunt-deploy-lambda/test/defaultEnv.js',
            envVariablePrefix: 'myApp_',
            options: {
                awsProfile: 'default'
            }
        },
        alternate: {
            functionArn: 'arn:aws:lambda:us-east-1:5555555:function:anotherLambda',
            //envFilePath: '../test/alternateEnv.js', commented out--will fall back to default.envFilePath
            envVariablePreifx: 'myOtherApp_',
            options: {
                awsProfile: 'sandbox'
            }
        }
    }


Please feel free to take a look at the `Gruntfile` in my `test` directory for further explanation/commentary.

[1]:*awsProfile is an optional specificaiton per configuration; if not specified, it will default to whatever "default" profile credentials
contianed in your local `~/.aws/credentials` file.

