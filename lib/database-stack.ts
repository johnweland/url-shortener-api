import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CfnParameter } from 'aws-cdk-lib';
import * as resourceGroup from 'aws-cdk-lib/aws-resourcegroups';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class DatabaseStack extends cdk.Stack {
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
    console.log(project);

    const stackname = cdk.Stack.of(this).stackName;

    cdk.Stack.of(this).tags.setTag('project', project.valueAsString);
    cdk.Stack.of(this).tags.setTag('env', environ.valueAsString);

    const table = new dynamodb.TableV2(this, `${stackname}-table`, {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      tableName: `${environ.valueAsString}-url-table`,
      encryption: dynamodb.TableEncryptionV2.awsManagedKey(),
      // replicas: [
      //   { region: 'us-west-2' },
      // ],
    });

    new cdk.CfnOutput(this, 'table-name', {
      value: table.tableName,
      description: 'The name of the DynamoDB table',
      exportName: `${environ.valueAsString}-table-name`,
    })
  }
}
