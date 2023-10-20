import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ICoreStackProps } from '../bin/stack-config-types';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';


export class DatabaseStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ICoreStackProps) {
    super(scope, id, props);
    // tag the stack with the project and stage
    cdk.Tags.of(this).add('project', props.project);
    cdk.Tags.of(this).add('stage', props.stage);

    // create a global table using DynamoDB
    new Table(this, `${props.stage}-${props.project}-table`, {
      tableName: `${props.stage}-${props.project}-table`,
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
      // replicationRegions: ['us-west-2'],
    })

    new cdk.CfnOutput(this, 'table-arn', {
      value: `arn:aws:dynamodb:${this.region}:${this.account}:table/${props.stage}-${props.project}-table`,
      description: 'DynamoDB Table ARN',
      exportName: `${props.stage}-${props.project}-table-arn`
    })

    new cdk.CfnOutput(this, 'table-name', {
      value: `${props.stage}-${props.project}-table`,
      description: 'DynamoDB Table Name',
      exportName: `${props.stage}-${props.project}-table-name`
    })

  }
}
