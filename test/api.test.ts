import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ApiStack } from '../lib/api-stack';
import { coreStackProps } from '../bin/stack-config';

test('API Gateway Created', () => {
  const app = new cdk.App();
  const stack = new ApiStack(app, 'MyTestStack', {
    ...coreStackProps
  });
  const template = Template.fromStack(stack);

  template.hasResource('AWS::ApiGateway::RestApi', {
    Properties: {
      Name: "dev-url-shortner-api"
    }
  });
});

test('Lambdas Created', () => {
  const app = new cdk.App();
  const stack = new ApiStack(app, 'MyTestStack', {
    ...coreStackProps
  });
  const template = Template.fromStack(stack);

  template.hasResource('AWS::Lambda::Function', {
    Properties: {
      FunctionName: "dev-url-shortner-GET-lambda",
      Handler: "get_function.lambda_handler",
    }
  });
});

test('Roles Created', () => {
  const app = new cdk.App();
  const stack = new ApiStack(app, 'MyTestStack', {
    ...coreStackProps
  });
  const template = Template.fromStack(stack);

  template.hasResource('AWS::IAM::Role', {
    Properties: {
      Policies: [
        {
          PolicyName: 'dynamo-read-policy',
        }
      ],
      RoleName: "dev-url-shortner-dynamo-GET-role"
    },
  });
});