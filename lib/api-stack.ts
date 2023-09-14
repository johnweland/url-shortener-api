import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CfnParameter } from 'aws-cdk-lib';
import * as resourceGroup from 'aws-cdk-lib/aws-resourcegroups';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';


export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const stackname = cdk.Stack.of(this).stackName;

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

    cdk.Stack.of(this).tags.setTag('project', project.valueAsString);
    cdk.Stack.of(this).tags.setTag('env', environ.valueAsString);

    const apigw = new apigateway.RestApi(this, `${stackname}-api`, {
      restApiName: `${environ.valueAsString}-url-shortner-api`,
      deployOptions: {
        stageName: 'dev',
      },
      endpointTypes: [apigateway.EndpointType.REGIONAL],
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    new cdk.CfnOutput(this, 'api-arn', {
      value: apigw.arnForExecuteApi(),
      description: 'The URL of the API',
      exportName: `${environ.valueAsString}-api-arn`,
    })

  }
}
