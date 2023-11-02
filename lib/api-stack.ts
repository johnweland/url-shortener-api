import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { IApiStackProps } from '../bin/stack-config-types';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as Lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';



export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: IApiStackProps) {
    super(scope, id, props);

    cdk.Tags.of(this).add('project', props.project);
    cdk.Tags.of(this).add('stage', props.stage);


    const _logGroup = new cdk.aws_logs.LogGroup(this, `APIGatewayLogGroup`, {
      logGroupName: `/aws/apigateway/${props.stage}-${props.project}/GatewayExecutionLogs`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      retention: cdk.aws_logs.RetentionDays.ONE_WEEK,
    });

    const _api = new apigateway.RestApi(this, `APIGateWay`, {
      restApiName: `${props.stage}-${props.project}-api-gateway`,
      description: `An API Gateway for the ${props.project} service`,
      endpointTypes: [apigateway.EndpointType.EDGE],
      deployOptions: {
        stageName: props.stage,
        metricsEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        accessLogDestination: new apigateway.LogGroupLogDestination(_logGroup),
        dataTraceEnabled: true,
        tracingEnabled: true,
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

    _api.metricClientError().createAlarm(this, 'ClientErrorAlarm', {
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: '4XX Client Error',
      alarmName: `${props.stage}-${props.project}-client-error`,
      treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    _api.metricServerError().createAlarm(this, 'ServerErrorAlarm', {
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: '5XX Server Error',
      alarmName: `${props.stage}-${props.project}-server-error`,
      treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    const _powertoolsLayer = Lambda.LayerVersion.fromLayerVersionArn(this, `PowertoolsLambdaLayer`, `arn:aws:lambda:${this.region}:017000801446:layer:AWSLambdaPowertoolsPythonV2:46`);

    props.lambdas.forEach((lambda) => {
      const _role = new iam.Role(this, `${lambda.name}Role`, {
        roleName: `${props.stage}-${props.project}-${lambda.name}-role`,
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        description: `A Role allowing ${lambda.name} access to the ${props.stage}-${props.project}-table`,
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        ],
        inlinePolicies: {
          'dynamo-read-policy': new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: lambda.actions,
                resources: [
                  `arn:aws:dynamodb:${this.region}:${this.account}:table/${props.stage}-${props.project}-table`,
                  `arn:aws:dynamodb:${this.region}:${this.account}:table/${props.stage}-${props.project}-table/index/*`,
                ],
              }),
            ],
          }),
        }
      });
      new cdk.aws_logs.LogGroup(this, `${lambda.name}LogGroup`, {
        logGroupName: `/aws/lambda/${props.stage}-${props.project}-${lambda.name}-lambda`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        retention: cdk.aws_logs.RetentionDays.ONE_WEEK,
      });

      const _lambda = new Lambda.Function(this, `${lambda.name}-Lambda`, {
        functionName: `${props.stage}-${props.project}-${lambda.name}-lambda`,
        description: `Handles ${lambda.name} requests for the ${props.project} micro-service`,
        runtime: Lambda.Runtime.PYTHON_3_10,
        handler: lambda.handler,
        code: Lambda.Code.fromAsset('src'),
        memorySize: lambda.memorySize,
        timeout: cdk.Duration.seconds(10),
        logRetention: 30,
        layers: [
          _powertoolsLayer
        ],
        role: _role,
      });

      _lambda.metricInvocations({
        period: cdk.Duration.minutes(1),
        statistic: 'sum',
      }).createAlarm(this, `${lambda.name}-lambdaInvocationsAlarm`, {
        threshold: 50,
        evaluationPeriods: 1,
        alarmDescription: `${lambda.name} Invocations: More that 50 in 1 minute or less`,
        alarmName: `${props.stage}-${props.project}-${lambda.name}-lambda-invocations`,
        treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING,
      })

      _lambda.metricErrors({
        period: cdk.Duration.minutes(5),
        statistic: 'sum',
      }).createAlarm(this, `${lambda.name}-lambdaErrorsAlarm`, {
        threshold: 5,
        evaluationPeriods: 1,
        alarmDescription: `${lambda.name} Errors: More than 5 in 5 minutes or less`,
        alarmName: `${props.stage}-${props.project}-${lambda.name}-lambda-errors`,
        treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING,
      })

      _lambda.metricDuration({
        period: cdk.Duration.seconds(10),
        statistic: 'avg',
      }).createAlarm(this, `${lambda.name}-lambdaDurationAlarm`, {
        threshold: 5,
        evaluationPeriods: 2,
        alarmDescription: `${lambda.name} Duration: More than 5 seconds for 2 consecutive 5 second periods`,
        alarmName: `${props.stage}-${props.project}-${lambda.name}-lambda-duration`,
        treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING,
      })

      new cdk.CfnOutput(this, `${lambda.name}-lambdaARN`, {
        value: `${_lambda.functionArn}`,
        description: `${lambda.name} Lambda ARN`,
        exportName: `${props.stage}-${props.project}-${lambda.name}-lambda-arn`
      });

      _api.root.addMethod(`${lambda.name}`, new apigateway.LambdaIntegration(_lambda));
      if (lambda.name === 'GET') {
        _api.root.addResource('{id}').addMethod('GET', new apigateway.LambdaIntegration(_lambda));
      }
    });

    new cdk.CfnOutput(this, 'APIUrl', {
      value: `${_api.url}`,
      description: 'API URL',
      exportName: `${props.stage}-${props.project}-api-url`
    });
  }
}
