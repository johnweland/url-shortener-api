import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ICoreStackProps } from '../bin/stack-config-types';
import { Alarm, Dashboard } from 'aws-cdk-lib/aws-cloudwatch';
import * as resourceGroup from 'aws-cdk-lib/aws-resourcegroups';

export class ObservabilityStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ICoreStackProps) {
    super(scope, id, props);

    cdk.Tags.of(this).add('project', props.project);
    cdk.Tags.of(this).add('stage', props.stage);

    const dashboard = new Dashboard(this, `dashboard`, {
      dashboardName: `${props.stage}-${props.project}-dashboard`,
      defaultInterval: cdk.Duration.hours(3),
    })

    dashboard.addWidgets(
      new cdk.aws_cloudwatch.TextWidget({
        markdown: `## DynamoDB`,
        width: 24,
        height: 1,
      }),
      new cdk.aws_cloudwatch.GraphWidget({
        title: 'Read usage (average units/second)',
        height: 6,
        right: [
          new cdk.aws_cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'ConsumedReadCapacityUnits',
            label: 'Consumed',
            dimensionsMap: {
              TableName: `${props.stage}-${props.project}-table`,
            },
            period: cdk.Duration.hours(3),
            statistic: 'sum',
          }),
        ],
        left: [
          new cdk.aws_cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'ProvisionedReadCapacityUnits',
            label: 'Provisioned',
            dimensionsMap: {
              TableName: `${props.stage}-${props.project}-table`,
            },
            period: cdk.Duration.hours(3),
            statistic: 'sum',
          }),
        ],
      }),
      new cdk.aws_cloudwatch.GraphWidget({
        title: 'Write usage (average units/second)',
        height: 6,
        right: [
          new cdk.aws_cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'ConsumedWriteCapacityUnits',
            label: 'Consumed',
            dimensionsMap: {
              TableName: `${props.stage}-${props.project}-table`,
            },
            period: cdk.Duration.hours(3),
            statistic: 'sum',
          }),
        ],
        left: [
          new cdk.aws_cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'ProvisionedWriteCapacityUnits',
            label: 'Provisioned',
            dimensionsMap: {
              TableName: `${props.stage}-${props.project}-table`,
            },
            period: cdk.Duration.hours(3),
            statistic: 'sum',
          }),
        ],
      }),
      new cdk.aws_cloudwatch.GraphWidget({
        title: 'User Errors',
        height: 6,
        left: [
          new cdk.aws_cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'UserErrors',
            label: 'Errors',
            dimensionsMap: {
              TableName: `${props.stage}-${props.project}-table`,
            },
            period: cdk.Duration.hours(3),
            statistic: 'sum',
          }),
        ],
      }),
      new cdk.aws_cloudwatch.AlarmStatusWidget({
        title: 'Dynamo Alarms',
        height: 6,
        alarms: [
          Alarm.fromAlarmArn(this, 'dynamo-read-alarms', `arn:aws:cloudwatch:${this.region}:${this.account}:alarm:${props.stage}-${props.project}-dynamo-read-throttle-events`),
          Alarm.fromAlarmArn(this, 'dynamo-write-alarms', `arn:aws:cloudwatch:${this.region}:${this.account}:alarm:${props.stage}-${props.project}-dynamo-write-throttle-events`),
          Alarm.fromAlarmArn(this, 'dynamo-user-alarm', `arn:aws:cloudwatch:${this.region}:${this.account}:alarm:${props.stage}-${props.project}-dynamo-user-errors`),
        ],
      }),
    );

    dashboard.addWidgets(
      new cdk.aws_cloudwatch.TextWidget({
        markdown: `## Lambda`,
        width: 24,
        height: 1,
      }),
      new cdk.aws_cloudwatch.GraphWidget({
        title: 'Invocations',
        view: cdk.aws_cloudwatch.GraphWidgetView.TIME_SERIES,
        width: 8,
        left: [
          new cdk.aws_cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Invocations',
            label: 'GET',
            dimensionsMap: {
              FunctionArn: `arn:aws:lambda:${this.region}:${this.account}:function:${props.stage}-${props.project}-GET-lambda`,
            },
            period: cdk.Duration.hours(3),
            statistic: 'sum',
          }),
          new cdk.aws_cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Invocations',
            label: 'POST',
            dimensionsMap: {
              FunctionArn: `arn:aws:lambda:${this.region}:${this.account}:function:${props.stage}-${props.project}-POST-lambda`,
            },
            period: cdk.Duration.hours(3),
            statistic: 'sum',
          }),
          new cdk.aws_cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Invocations',
            label: 'PUT',
            dimensionsMap: {
              FunctionArn: `arn:aws:lambda:${this.region}:${this.account}:function:${props.stage}-${props.project}-PUT-lambda`,

            },
            period: cdk.Duration.hours(3),
            statistic: 'sum',
          }),
          new cdk.aws_cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Invocations',
            label: 'PATCH',
            dimensionsMap: {
              FunctionArn: `arn:aws:lambda:${this.region}:${this.account}:function:${props.stage}-${props.project}-PATCH-lambda`,

            },
            period: cdk.Duration.hours(3),
            statistic: 'sum',
          }),
          new cdk.aws_cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Invocations',
            label: 'DELETE',
            dimensionsMap: {
              FunctionArn: `arn:aws:lambda:${this.region}:${this.account}:function:${props.stage}-${props.project}-DELETE-lambda`,
            },
            period: cdk.Duration.hours(3),
            statistic: 'sum',
          }),
        ],
      }),
      new cdk.aws_cloudwatch.GraphWidget({
        title: 'Duration',
        view: cdk.aws_cloudwatch.GraphWidgetView.TIME_SERIES,
        width: 8,
        left: [
          new cdk.aws_cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Duration',
            label: 'GET',
            dimensionsMap: {
              FunctionArn: `arn:aws:lambda:${this.region}:${this.account}:function:${props.stage}-${props.project}-GET-lambda`,
            },
            period: cdk.Duration.hours(3),
            statistic: 'sum',
          }),
          new cdk.aws_cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Duration',
            label: 'POST',
            dimensionsMap: {
              FunctionArn: `arn:aws:lambda:${this.region}:${this.account}:function:${props.stage}-${props.project}-POST-lambda`,
            },
            period: cdk.Duration.hours(3),
            statistic: 'sum',
          }),
          new cdk.aws_cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Duration',
            label: 'PUT',
            dimensionsMap: {
              FunctionArn: `arn:aws:lambda:${this.region}:${this.account}:function:${props.stage}-${props.project}-PUT-lambda`,
            },
            period: cdk.Duration.hours(3),
            statistic: 'sum',
          }),
          new cdk.aws_cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Duration',
            label: 'PATCH',
            dimensionsMap: {
              FunctionArn: `arn:aws:lambda:${this.region}:${this.account}:function:${props.stage}-${props.project}-PATCH-lambda`,
            },
            period: cdk.Duration.hours(3),
            statistic: 'sum',
          }),
          new cdk.aws_cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Duration',
            label: 'DELETE',
            dimensionsMap: {
              FunctionArn: `arn:aws:lambda:${this.region}:${this.account}:function:${props.stage}-${props.project}-DELETE-lambda`,
            },
            period: cdk.Duration.hours(3),
            statistic: 'sum',
          }),
        ],
      }),
      new cdk.aws_cloudwatch.GraphWidget({
        title: 'Errors',
        view: cdk.aws_cloudwatch.GraphWidgetView.TIME_SERIES,
        width: 8,
        left: [
          new cdk.aws_cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Errors',
            label: 'GET',
            dimensionsMap: {
              FunctionArn: `arn:aws:lambda:${this.region}:${this.account}:function:${props.stage}-${props.project}-GET-lambda`,
            },
            period: cdk.Duration.hours(3),
            statistic: 'sum',
          }),
          new cdk.aws_cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Errors',
            label: 'POST',
            dimensionsMap: {
              FunctionArn: `arn:aws:lambda:${this.region}:${this.account}:function:${props.stage}-${props.project}-POST-lambda`,
            },
            period: cdk.Duration.hours(3),
            statistic: 'sum',
          }),
          new cdk.aws_cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Errors',
            label: 'PUT',
            dimensionsMap: {
              FunctionArn: `arn:aws:lambda:${this.region}:${this.account}:function:${props.stage}-${props.project}-PUT-lambda`,
            },
            period: cdk.Duration.hours(3),
            statistic: 'sum',
          }),
          new cdk.aws_cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Errors',
            label: 'PATCH',
            dimensionsMap: {
              FunctionArn: `arn:aws:lambda:${this.region}:${this.account}:function:${props.stage}-${props.project}-PATCH-lambda`,
            },
            period: cdk.Duration.hours(3),
            statistic: 'sum',
          }),
          new cdk.aws_cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Errors',
            label: 'DELETE',
            dimensionsMap: {
              FunctionArn: `arn:aws:lambda:${this.region}:${this.account}:function:${props.stage}-${props.project}-DELETE-lambda`,
            },
            period: cdk.Duration.hours(3),
            statistic: 'sum',
          }),
        ],
      }),

      new cdk.aws_cloudwatch.AlarmStatusWidget({
        title: 'Lambda Invocations',
        width: 8,
        alarms: [
          Alarm.fromAlarmArn(this, 'get-lambda-invocations', `arn:aws:cloudwatch:${this.region}:${this.account}:alarm:${props.stage}-${props.project}-GET-lambda-invocations`),
          Alarm.fromAlarmArn(this, 'post-lambda-invocations', `arn:aws:cloudwatch:${this.region}:${this.account}:alarm:${props.stage}-${props.project}-POST-lambda-invocations`),
          Alarm.fromAlarmArn(this, 'put-lambda-invocations', `arn:aws:cloudwatch:${this.region}:${this.account}:alarm:${props.stage}-${props.project}-PUT-lambda-invocations`),
          Alarm.fromAlarmArn(this, 'patch-lambda-invocations', `arn:aws:cloudwatch:${this.region}:${this.account}:alarm:${props.stage}-${props.project}-PATCH-lambda-invocations`),
          Alarm.fromAlarmArn(this, 'delete-lambda-invocations', `arn:aws:cloudwatch:${this.region}:${this.account}:alarm:${props.stage}-${props.project}-DELETE-lambda-invocations`),
        ],
      }),
      new cdk.aws_cloudwatch.AlarmStatusWidget({
        title: 'Lambda Duration',
        width: 8,
        alarms: [
          Alarm.fromAlarmArn(this, 'get-lambda-duration', `arn:aws:cloudwatch:${this.region}:${this.account}:alarm:${props.stage}-${props.project}-GET-lambda-duration`),
          Alarm.fromAlarmArn(this, 'post-lambda-duration', `arn:aws:cloudwatch:${this.region}:${this.account}:alarm:${props.stage}-${props.project}-POST-lambda-duration`),
          Alarm.fromAlarmArn(this, 'put-lambda-duration', `arn:aws:cloudwatch:${this.region}:${this.account}:alarm:${props.stage}-${props.project}-PUT-lambda-duration`),
          Alarm.fromAlarmArn(this, 'patch-lambda-duration', `arn:aws:cloudwatch:${this.region}:${this.account}:alarm:${props.stage}-${props.project}-PATCH-lambda-duration`),
          Alarm.fromAlarmArn(this, 'delete-lambda-duration', `arn:aws:cloudwatch:${this.region}:${this.account}:alarm:${props.stage}-${props.project}-DELETE-lambda-duration`),
        ],
      }),
      new cdk.aws_cloudwatch.AlarmStatusWidget({
        title: 'Lambda Errors',
        width: 8,
        alarms: [
          Alarm.fromAlarmArn(this, 'get-lambda-errors', `arn:aws:cloudwatch:${this.region}:${this.account}:alarm:${props.stage}-${props.project}-GET-lambda-errors`),
          Alarm.fromAlarmArn(this, 'post-lambda-errors', `arn:aws:cloudwatch:${this.region}:${this.account}:alarm:${props.stage}-${props.project}-POST-lambda-errors`),
          Alarm.fromAlarmArn(this, 'put-lambda-errors', `arn:aws:cloudwatch:${this.region}:${this.account}:alarm:${props.stage}-${props.project}-PUT-lambda-errors`),
          Alarm.fromAlarmArn(this, 'patch-lambda-errors', `arn:aws:cloudwatch:${this.region}:${this.account}:alarm:${props.stage}-${props.project}-PATCH-lambda-errors`),
          Alarm.fromAlarmArn(this, 'delete-lambda-errors', `arn:aws:cloudwatch:${this.region}:${this.account}:alarm:${props.stage}-${props.project}-DELETE-lambda-errors`),
        ],
      }),
    );

    dashboard.addWidgets(
      new cdk.aws_cloudwatch.TextWidget({
        markdown: `## API Gateway`,
        width: 24,
        height: 1,
      }),

      new cdk.aws_cloudwatch.LogQueryWidget({
        title: 'API Gateway Logs',
        width: 18,
        height: 6,
        logGroupNames: [
          `/aws/apigateway/${props.stage}-${props.project}/GatewayExecutionLogs`,
        ],
        queryLines: [
          'fields @timestamp, @message',
          'sort @timestamp desc',
        ],
      }),
      new cdk.aws_cloudwatch.AlarmStatusWidget({
        title: 'API Gateway Alarms',
        width: 6,
        height: 6,
        alarms: [
          Alarm.fromAlarmArn(this, 'api-client-errors', `arn:aws:cloudwatch:${this.region}:${this.account}:alarm:${props.stage}-${props.project}-client-error`),
          Alarm.fromAlarmArn(this, 'api-server-errors', `arn:aws:cloudwatch:${this.region}:${this.account}:alarm:${props.stage}-${props.project}-server-error`),
        ],
      }),
    );

    new cdk.CfnOutput(this, 'dashboardUrl', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${props.stage}-${props.project}-dashboard`,
      description: 'Cloudwatch Dashboard URL',
    })

    new cdk.CfnOutput(this, 'dashboardARN', {
      value: `arn:aws:cloudwatch::${this.account}:dashboard/${props.stage}-${props.project}-dashboard`,
      description: 'Cloudwatch Dashboard ARN',
      exportName: `${props.stage}-${props.project}-dashboard-arn`
    })

    new resourceGroup.CfnGroup(this, `resourceGroup`, {
      name: `${props.stage}-${props.project}`,
      resourceQuery: {
        type: 'TAG_FILTERS_1_0',
        query: {
          resourceTypeFilters: [
            "AWS::AllSupported"
          ],
          tagFilters: [
            {
              key: "project",
              values: [
                `${props.project}`
              ]
            },
            {
              key: "stage",
              values: [
                `${props.stage}`
              ]
            }
          ]
        }
      }
    });

    new cdk.CfnOutput(this, 'resourceGroupName', {
      value: `${props.stage}-${props.project}`,
      description: 'Resource Group Name',
      exportName: `${props.stage}-${props.project}-resource-group`
    })

  }
}