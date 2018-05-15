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

awsProfile is an optional specificaiton per configuration; if not specified, it will default to the "default" profile credentials
contianed in your local `~/.aws/credentials` file.

Below shows an example grunt configuration for two target configs: default (required) and alternate:

    deploy_lambda_from_s3: {
        default: {
            packagePath: 'lambda-function-code-0-1_2018.zip',
            bucket: 'default-s3-bucket',
            functionArn: 'arn:aws:lambda:us-east-1:55555555:function:myLambdaFunc',
            options: {
                awsProfile: 'myprofile'
            }
        },
        alternate: {
            packagePath: 'some/path/to/overriding_package.zip',
            bucket: 'takes-presedence-over-default-bucket',
            //functionArn: 'Commented out--will fall back to default.functionArn',
            options: {
                awsProfile: 'sandbox'
            }
        }
    }

