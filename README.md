# grunt-deploy-lambda
Grunt plugin tasks for deploying a package stored in S3 to AWS Lambda

Use of this package requires that you have installed the Grunt CLI and package via `npm install grunt`, in addition to this package.

Use of this package also requires a valid grunt configuration (which can be done in code via `grunt.initConfiguration()`) as described with each respective task.

You may access these tasks programmatically after loading package into your grunt via: `grunt.loadNpmTasks('@onaje/grunt-deploy-lambda');`

## Task: deploy_lambda_from_s3:<targetConfig> [--aws-profile]
Deploys the specified package from an S3 Bucket to AWS Lambda

example CLI usage: `grunt deploy_lambda_from_s3:default --aws-profile=default`

NOTE: The "--aws-profile" option overries any `options.awsProfile` specified in the target configuration.
Similarly, setting the environment variable AWS_PROFILE will override any specified "--aws-profile" option as well as any target configuration.

#### deploy_lambda_from_s3: Configuration 
To properly configure this task, one must specify at least a default configuration for the following configuration parameters:
 - bucket: string of the S3 bucket containing the desired package
 - packagePath: string of the path to the zipped package within S3
 - functionArn: string ARN (Amazon Resource Name) of the lambda function to be deployed
 - awsProfile (optional): string of the AWS Profile to use when performing deploy, matching some profile credential within your `~/.aws/credentials`
 - lambdaConfigOptions (optional): object containing optional configuration parameters for the lambda function to be deployed. Unlike other configuration params, failing to specify these per configuration target will **NOT** result in defaults being used. In other words, these will **NOT** fall back to whatever `default.lambdaConfigOptions` you may have set. Your lambda's configuration will simply not be updated.

awsProfile is an optional specificaiton per configuration; if not specified, it will default to the "default" profile credentials
contianed in your local `~/.aws/credentials` file.

Below shows an example grunt configuration for two target configs: default (required) and alternate:

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
    }

