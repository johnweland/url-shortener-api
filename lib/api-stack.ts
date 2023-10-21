import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ICoreStackProps } from '../bin/stack-config-types';
import * as APIGW from 'aws-cdk-lib/aws-apigateway';
import * as Lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';


export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ICoreStackProps) {
    super(scope, id, props);

    cdk.Tags.of(this).add('project', props.project);
    cdk.Tags.of(this).add('stage', props.stage);

    const readRole = new iam.Role(this, `${props.stage}-${props.project}-dynamo-GET-role`, {
      roleName: `${props.stage}-${props.project}-dynamo-GET-role`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: `Allows Scan and Query of items from the ${props.stage}-${props.project}-table`,
      inlinePolicies: {
        'dynamo-read-policy': new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'dynamodb:Query',
                'dynamodb:Scan',
                'dynamodb:GetItem',
                'dynamodb:BatchGetItem',
              ],
              resources: [
                `arn:aws:dynamodb:${this.region}:${this.account}:table/${props.stage}-${props.project}-table`,
                `arn:aws:dynamodb:${this.region}:${this.account}:table/${props.stage}-${props.project}-table/index/*`,
              ],
            }),
          ],
        }),
      }
    });

    // const writeRole = new iam.Role(this, `${props.stage}-${props.project}dynamo-PUT-role`, {
    //   roleName: `${props.stage}-${props.project}-dynamo-PUT-role`,
    //   assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    //   description: `Role to Put, Batch Write, and Update items from the ${props.stage}-${props.project}-table`,
    //   inlinePolicies: {
    //     'dynamo-write-policy': new iam.PolicyDocument({
    //       statements: [
    //         new iam.PolicyStatement({
    //           effect: iam.Effect.ALLOW,
    //           actions: [
    //             'dynamodb:PutItem',
    //             'dynamodb:UpdateItem',
    //             'dynamodb:BatchWriteItem',
    //           ],
    //           resources: [
    //             `arn:aws:dynamodb:${this.region}:${this.account}:table/${props.stage}-${props.project}-table`,
    //             `arn:aws:dynamodb:${this.region}:${this.account}:table/${props.stage}-${props.project}-table/index/*`,
    //           ],
    //         }),
    //       ],
    //     }),
    //   }
    // })

    // const deleteRole = new iam.Role(this, `${props.stage}-${props.project}dynamo-DELETE-role`, {
    //   roleName: `${props.stage}-${props.project}-dynamo-DELETE-role`,
    //   assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    //   description: `Role to Remove items from the ${props.stage}-${props.project}-table`,
    //   inlinePolicies: {
    //     'dynamo-delete-policy': new iam.PolicyDocument({
    //       statements: [
    //         new iam.PolicyStatement({
    //           effect: iam.Effect.ALLOW,
    //           actions: [
    //             'dynamodb:DeleteItem',
    //             'dynamodb:BatchWriteItem',
    //           ],
    //           resources: [
    //             `arn:aws:dynamodb:${this.region}:${this.account}:table/${props.stage}-${props.project}-table`,
    //             `arn:aws:dynamodb:${this.region}:${this.account}:table/${props.stage}-${props.project}-table/index/*`,
    //           ],
    //         }),
    //       ],
    //     }),
    //   }
    // })

    // create the Layer for AWS Lambda Powertools
    const powertoolsLayer = Lambda.LayerVersion.fromLayerVersionArn(this, `${props.stage}-${props.project}-powertools-layer`, `arn:aws:lambda:${this.region}:017000801446:layer:AWSLambdaPowertoolsPythonV2:46`);
    // Create the Lambda functions for GET, POST, PUT, PATCH, and DELETE
    const getLambda = new Lambda.Function(this, `${props.stage}-${props.project}-GET-lambda`, {
      functionName: `${props.stage}-${props.project}-GET-lambda`,
      description: `Handles GET requests for the ${props.project} micro-service`,
      runtime: Lambda.Runtime.PYTHON_3_10,
      handler: 'get_function.lambda_handler',
      code: Lambda.Code.fromAsset('src'),
      memorySize: 128,
      timeout: cdk.Duration.seconds(10),
      layers: [
        powertoolsLayer
      ],
      role: readRole,
    });

    // const postLambda = new Lambda.Function(this, `${props.stage}-${props.project}-POST-lambda`, {
    //   functionName: `${props.stage}-${props.project}-POST-lambda`,
    //   runtime: Lambda.Runtime.PYTHON_3_10,
    //   handler: 'get_function.lambda_handler',
    //   code: Lambda.Code.fromAsset('src'),
    //   memorySize: 128,
    //   timeout: cdk.Duration.seconds(10),
    //    layers: [
    //      powertoolsLayer
    //    ],
    //    role: modifyRole,
    // });

    // const putLambda = new Lambda.Function(this, `${props.stage}-${props.project}-PUT-lambda`, {
    //   functionName: `${props.stage}-${props.project}-PUT-lambda`,
    //   runtime: Lambda.Runtime.PYTHON_3_10,
    //   handler: 'get_function.lambda_handler',
    //   code: Lambda.Code.fromAsset('src'),
    //   memorySize: 128,
    //   timeout: cdk.Duration.seconds(10),
    //    layers: [
    //      powertoolsLayer
    //    ],
    //    role: modifyRole,
    // });

    // const patchLambda = new Lambda.Function(this, `${props.stage}-${props.project}-PATCH-lambda`, {
    //   functionName: `${props.stage}-${props.project}-PATCH-lambda`,
    //   runtime: Lambda.Runtime.PYTHON_3_10,
    //   handler: 'get_function.lambda_handler',
    //   code: Lambda.Code.fromAsset('src'),
    //   memorySize: 128,
    //   timeout: cdk.Duration.seconds(10),
    //    layers: [
    //      powertoolsLayer
    //    ],
    //    role: modifyRole,
    // });

    // const deleteLambda = new Lambda.Function(this, `${props.stage}-${props.project}-DELETE-lambda`, {
    //   functionName: `${props.stage}-${props.project}-DELETE-lambda`,
    //   runtime: Lambda.Runtime.PYTHON_3_10,
    //   handler: 'get_function.lambda_handler',
    //   code: Lambda.Code.fromAsset('src'),
    //   memorySize: 128,
    //   timeout: cdk.Duration.seconds(10),
    //   layers: [
    //      powertoolsLayer
    //   ],
    //    role: modifyRole,
    // });

    // Create the API Gateway and attache the Lambda functions to the appropriate endpoints with methods
    const api = new APIGW.RestApi(this, `${props.stage}-${props.project}-api`, {
      restApiName: `${props.stage}-${props.project}-api`,
      description: `An API for the ${props.project} service`,
      deployOptions: {
        stageName: props.stage,
        metricsEnabled: true,
        loggingLevel: APIGW.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
      },
      endpointConfiguration: {
        types: [APIGW.EndpointType.REGIONAL],
      },
      defaultCorsPreflightOptions: {
        allowHeaders: ['*'],
        allowOrigins: ['*'],
        allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowCredentials: true,
        statusCode: 200,
      },
      cloudWatchRole: true,
    });

    api.root.addMethod('GET', new APIGW.LambdaIntegration(getLambda));
    api.root.addResource('{id}').addMethod('GET', new APIGW.LambdaIntegration(getLambda));

    new cdk.CfnOutput(this, 'api-url', {
      value: `${api.url}`,
      description: 'API URL',
      exportName: `${props.stage}-${props.project}-api-url`
    });
  }
}
