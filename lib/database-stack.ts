import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ICoreStackProps } from '../bin/stack-config-types';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';

export class DatabaseStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ICoreStackProps) {
    super(scope, id, props);

    cdk.Tags.of(this).add('project', props.project);
    cdk.Tags.of(this).add('stage', props.stage);

    /**
     * DynamoDB Table
     * 
     * @memberof DatabaseStack
     * @see https://docs.aws.amazon.com/cdk/api/latest/docs/aws-dynamodb-readme.html
     */
    const table = new Table(this, `table`, {
      tableName: `${props.stage}-${props.project}-table`,
      partitionKey: {
        name: 'slug',
        type: AttributeType.STRING
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
    })

    /**
     * DynamoDB Table Metrics and Alarms
     * 
     * @memberof DatabaseStack
     * @see https://docs.aws.amazon.com/cdk/api/latest/docs/aws-cloudwatch-readme.html
     * @see https://docs.aws.amazon.com/cdk/api/latest/docs/aws-dynamodb-readme.html
     */
    table.metric('readThrottleEvents', {
      period: cdk.Duration.minutes(5),
      statistic: 'sum',
    }).createAlarm(this, 'readThrottleEventsAlarm', {
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: 'Read Throttle Events',
      alarmName: `${props.stage}-${props.project}-dynamo-read-throttle-events`,
      treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING,
    })

    table.metric('writeThrottleEvents', {
      period: cdk.Duration.minutes(5),
      statistic: 'sum',
    }).createAlarm(this, 'writeThrottleEvents-Alarm', {
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: 'Write Throttle Events',
      alarmName: `${props.stage}-${props.project}-dynamo-write-throttle-events`,
      treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING,
    })

    table.metric('userErrors', {
      period: cdk.Duration.minutes(5),
      statistic: 'sum',
    }).createAlarm(this, 'userErrorsAlarm', {
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: 'User Errors',
      alarmName: `${props.stage}-${props.project}-dynamo-user-errors`,
      treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING,
    })

    /**
     * DynamoDB Table Outputs
     * 
     * @memberof DatabaseStack
     * @see https://docs.aws.amazon.com/cdk/api/latest/docs/aws-cdk-lib.CfnOutput.html
     */
    new cdk.CfnOutput(this, 'tableARN', {
      value: `arn:aws:dynamodb:${this.region}:${this.account}:table/${props.stage}-${props.project}-table`,
      description: 'DynamoDB Table ARN',
      exportName: `${props.stage}-${props.project}-table-arn`
    })

    new cdk.CfnOutput(this, 'tableName', {
      value: `${props.stage}-${props.project}-table`,
      description: 'DynamoDB Table Name',
      exportName: `${props.stage}-${props.project}-table-name`
    })
  }
}
