import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ICoreStackProps } from '../bin/stack-config-types';
import { Dashboard } from 'aws-cdk-lib/aws-cloudwatch';
import * as resourceGroup from 'aws-cdk-lib/aws-resourcegroups';

export class ObservabilityStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ICoreStackProps) {
    super(scope, id, props);

    cdk.Tags.of(this).add('project', props.project);
    cdk.Tags.of(this).add('stage', props.stage);

    props.dashboard = new Dashboard(this, `${props.stage}-${props.project}-dashboard`, {
      dashboardName: `${props.stage}-${props.project}-dashboard`,
      defaultInterval: cdk.Duration.minutes(1),
    })

    new cdk.CfnOutput(this, 'dashboardUrl', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${props.stage}-${props.project}-dashboard`,
      description: 'Cloudwatch Dashboard URL',
    })

    new cdk.CfnOutput(this, 'dashboardARN', {
      value: `arn:aws:cloudwatch::${this.account}:dashboard/${props.stage}-${props.project}-dashboard`,
      description: 'Cloudwatch Dashboard ARN',
      exportName: `${props.stage}-${props.project}-dashboard-arn`
    })

    new resourceGroup.CfnGroup(this, `resource-group`, {
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

    new cdk.CfnOutput(this, 'resource-group-name', {
      value: `${props.stage}-${props.project}`,
      description: 'Resource Group Name',
      exportName: `${props.stage}-${props.project}-resource-group`
    })
  }
}