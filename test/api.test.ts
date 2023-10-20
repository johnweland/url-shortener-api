import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { ApiStack } from '../lib/api-stack';
import { coreStackProps } from '../bin/stack-config';

let app: cdk.App, stack: cdk.Stack, template: Template;

beforeAll(() => {
  app = new cdk.App();
  stack = new ApiStack(app, 'APIStack', {
    ...coreStackProps
  });
  template = Template.fromStack(stack);
});

describe('API Gateway', () => {
  it('Should have an API Gateway with the name "dev-url-shortner-api" ', () => {
    template.hasResourceProperties('AWS::ApiGateway::RestApi',
      Match.objectLike({
        Name: "dev-url-shortner-api"
      })
    );
  });
  it('Should have a GET Method', () => {
    template.hasResourceProperties('AWS::ApiGateway::Method',
      Match.objectLike({
        HttpMethod: "GET"
      })
    );
  });
  it('Should have tags with the keys "project" and "stage" ', () => {
    template.hasResourceProperties('AWS::ApiGateway::RestApi',
      Match.objectLike({
        Tags: [
          {
            Key: "project",
            Value: coreStackProps.project,
          },
          {
            Key: "stage",
            Value: coreStackProps.stage,
          }
        ]
      })
    );
  });
  it('Should have a CloudFormation Output/Export for the api url', () => {
    template.hasOutput('*',
      Match.objectLike({
        Export: {
          Name: "dev-url-shortner-api-url"
        }
      })
    );
  });
});

describe('GET Lambda', () => {
  it('Should have a Lambda Function with the name "dev-url-shortner-GET-lambda" ', () => {
    template.hasResourceProperties('AWS::Lambda::Function',
      Match.objectLike({
        FunctionName: "dev-url-shortner-GET-lambda"
      })
    );
  });
  it('Should have tags with the keys "project" and "stage" ', () => {
    template.hasResourceProperties('AWS::Lambda::Function',
      Match.objectLike({
        Tags: [
          {
            Key: "project",
            Value: coreStackProps.project,
          },
          {
            Key: "stage",
            Value: coreStackProps.stage,
          }
        ]
      })
    );
  });
});

describe('GET Lambda: Role', () => {
  it('Should have a name "dev-url-shortner-dynamo-GET-role" ', () => {
    template.hasResourceProperties('AWS::IAM::Role',
      Match.objectLike({
        RoleName: "dev-url-shortner-dynamo-GET-role"
      })
    );
  });
  // it should have an inline policy named "dynamo-read-policy"
  // it should have an inline policy named "dynamo-read-policy" with the actions "dynamodb:GetItem" and "dynamodb:Query"
  it('Should have an inline policy named "dynamo-read-policy" with the actions "dynamodb:GetItem", "dynamodb:Query", "dynamodb:Scan" and "dynamodb:BatchGetItem"', () => {
    template.hasResourceProperties('AWS::IAM::Role',
      Match.objectLike({
        Policies: [
          {
            PolicyName: "dynamo-read-policy",
            PolicyDocument: {
              Statement: [
                {
                  Action: [
                    'dynamodb:Query',
                    'dynamodb:Scan',
                    'dynamodb:GetItem',
                    'dynamodb:BatchGetItem',
                  ]
                }
              ]
            }
          }
        ]
      })
    );
  });

});