import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CfnParameter } from 'aws-cdk-lib';
import * as resourceGroup from 'aws-cdk-lib/aws-resourcegroups';

export class SharedInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const project = new CfnParameter(this, "project", {
      type: "String",
      description: "The name of the project that this stack is deployed to."
    });

    const environ = new CfnParameter(this, "env", {
      type: "String",
      description: "The environment that this stack is deployed to.",
      allowedValues: ["dev", "test", "prod"],
      default: "dev"
    });

    const stackname = cdk.Stack.of(this).stackName;

    cdk.Stack.of(this).tags.setTag('project', project.valueAsString);
    cdk.Stack.of(this).tags.setTag('env', environ.valueAsString);


    const rg = new resourceGroup.CfnGroup(this, `${stackname}-resource-group`, {
      name: `${environ.valueAsString}-${project.valueAsString}`,
      description: 'Resource group for the project',
      resourceQuery: {
        type: 'CLOUDFORMATION_STACK_1_0',
      }
    })


    new cdk.CfnOutput(this, 'resource-group-arn', {
      value: rg.attrArn,
      description: 'The name of the resource group',
      exportName: `${environ.valueAsString}-resource-group-arn`,
    })
  }
}
