import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { DatabaseStack } from '../lib/database-stack';
import { coreStackProps } from '../bin/stack-config';

test('DynamoDB Created', () => {
  const app = new cdk.App();
  const stack = new DatabaseStack(app, 'MyTestStack', {
    ...coreStackProps
  });
  const template = Template.fromStack(stack);

  template.hasResource('AWS::DynamoDB::Table', {
    Properties: {
      TableName: "dev-url-shortner-table",
      KeySchema: [
        {
          AttributeName: "id",
          KeyType: "HASH"
        }
      ],
    }
  });
});