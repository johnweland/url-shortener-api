import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { DatabaseStack } from '../lib/database-stack';
import { coreStackProps } from '../bin/stack-config';
import { after } from 'node:test';

let app: cdk.App, stack: cdk.Stack, template: Template;

beforeAll(() => {
  app = new cdk.App();
  stack = new DatabaseStack(app, 'DatabaseStack', {
    ...coreStackProps
  });
  template = Template.fromStack(stack);
});

describe('DynamoDB Table', () => {
  it('Should have a DynamoDB Table with the name "dev-url-shortner-table" ', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table',
      {
        TableName: "dev-url-shortner-table"
      }
    );
  });
  it('Should have a partition key named "id" ', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table',
      {
        KeySchema: [
          {
            AttributeName: "id",
            KeyType: "HASH"
          }
        ],
      }
    );
  });
  it('Should have tags with the keys "project" and "stage" ', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table',
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
  it('Should have a CloudFormation Output/Export for the table name', () => {
    template.hasOutput('*',
      Match.objectLike({
        Export: {
          Name: "dev-url-shortner-table-name"
        }
      })
    );
  });
  it('Should have a CloudFormation Output/Export for the table ARN', () => {
    template.hasOutput('*',
      Match.objectLike({
        Export: {
          Name: "dev-url-shortner-table-arn"
        }
      })
    );
  });
});
