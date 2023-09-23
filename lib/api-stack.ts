import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CfnParameter } from 'aws-cdk-lib';
import * as resourceGroup from 'aws-cdk-lib/aws-resourcegroups';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Effect, Policy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { AwsIntegration } from 'aws-cdk-lib/aws-apigateway';

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const stackname = cdk.Stack.of(this).stackName;

    const project = new CfnParameter(this, "project", {
      type: "String",
      description: "The name of the project that this stack is deployed to.",
      default: "url-shortner"
    });

    const environ = new CfnParameter(this, "env", {
      type: "String",
      description: "The environment that this stack is deployed to.",
      allowedValues: ["dev", "test", "prod"],
      default: "dev"
    });

    // cdk.Stack.of(this).tags.setTag('project', project.valueAsString);
    // cdk.Stack.of(this).tags.setTag('env', environ.valueAsString);

    const table = new dynamodb.TableV2(this, `table`, {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      tableName: `${environ.valueAsString}-${project.valueAsString}-table`,
      encryption: dynamodb.TableEncryptionV2.awsManagedKey(),
      // replicas: [
      //   { region: 'us-west-2' },
      // ],
    });

    new cdk.CfnOutput(this, 'table-name', {
      value: table.tableName,
      description: 'The name of the DynamoDB table',
      exportName: `${environ.valueAsString}-${project.valueAsString}-table-name`,
    })

    const getPolicy = new Policy(this, 'getPolicy', {
      statements: [
        new PolicyStatement({
          actions: ['dynamodb:GetItem'],
          effect: Effect.ALLOW,
          resources: [table.tableArn],
        }),
      ],
    });
    const deletePolicy = new Policy(this, 'deletePolicy', {
      statements: [
        new PolicyStatement({
          actions: ['dynamodb:DeleteItem'],
          effect: Effect.ALLOW,
          resources: [table.tableArn],
        }),
      ],
    });

    const putPolicy = new Policy(this, 'putPolicy', {
      statements: [
        new PolicyStatement({
          actions: ['dynamodb:PutItem'],
          effect: Effect.ALLOW,
          resources: [table.tableArn],
        }),
      ],
    });

    const scanPolicy = new Policy(this, 'scanPolicy', {
      statements: [
        new PolicyStatement({
          actions: ['dynamodb:Scan'],
          effect: Effect.ALLOW,
          resources: [table.tableArn],
        }),
      ],
    });

    const getRole = new Role(this, 'getRole', {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
    });
    getRole.attachInlinePolicy(getPolicy);

    const deleteRole = new Role(this, 'deleteRole', {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
    });
    deleteRole.attachInlinePolicy(deletePolicy);
    getRole.attachInlinePolicy(getPolicy);
    const putRole = new Role(this, 'putRole', {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
    });
    putRole.attachInlinePolicy(putPolicy);
    const scanRole = new Role(this, 'scanRole', {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
    });
    scanRole.attachInlinePolicy(scanPolicy);

    const apigw = new apigateway.RestApi(this, `api-gateway`, {
      restApiName: `${environ.valueAsString}-${project.valueAsString}-api`,
      deployOptions: {
        stageName: `dev`,
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
      exportName: `${environ.valueAsString}-${project.valueAsString}-api-arn`,
    })

    const errorResponses = [
      {
        selectionPattern: '400',
        statusCode: '400',
        responseTemplates: {
          'application/json': `{
            "error": "Bad input!"
          }`,
        },
      },
      {
        selectionPattern: '5\\d{2}',
        statusCode: '500',
        responseTemplates: {
          'application/json': `{
            "error": "Internal Service Error!"
          }`,
        },
      },
    ];

    const integrationResponses = [
      {
        statusCode: '200',
      },
      ...errorResponses,
    ];

    const allResources = apigw.root.addResource("/api/v1/".toLocaleLowerCase());

    const oneResource = allResources.addResource('{id}');

    const getAllIntegration = new AwsIntegration({
      action: 'Scan',
      options: {
        credentialsRole: scanRole,
        integrationResponses,
        requestTemplates: {
          'application/json': `{
              "TableName": "${table.tableName}"
            }`,
        },
      },
      service: 'dynamodb',
    });

    const createIntegration = new AwsIntegration({
      action: 'PutItem',
      options: {
        credentialsRole: putRole,
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': `{
                "requestId": "$context.requestId"
              }`,
            },
          },
          ...errorResponses,
        ],
        requestTemplates: {
          'application/json': `{
              "Item": {
                "Id": {
                  "S": "$context.requestId"
                },
              },
              "TableName": "${table.tableName}"
            }`,
        },
      },
      service: 'dynamodb',
    });

    const deleteIntegration = new AwsIntegration({
      action: 'DeleteItem',
      options: {
        credentialsRole: deleteRole,
        integrationResponses,
        requestTemplates: {
          'application/json': `{
              "Key": {
                "Id": {
                  "S": "$method.request.path.id"
                }
              },
              "TableName": "${table.tableName}"
            }`,
        },
      },
      service: 'dynamodb',
    });

    const getIntegration = new AwsIntegration({
      action: 'GetItem',
      options: {
        credentialsRole: getRole,
        integrationResponses,
        requestTemplates: {
          'application/json': `{
              "Key": {
                "Id": {
                  "S": "$method.request.path.id"
                }
              },
              "TableName": "${table.tableName}"
            }`,
        },
      },
      service: 'dynamodb',
    });

    const updateIntegration = new AwsIntegration({
      action: 'PutItem',
      options: {
        credentialsRole: putRole,
        integrationResponses,
        requestTemplates: {
          'application/json': `{
              "Item": {
                "Id": {
                  "S": "$method.request.path.id"
                },
              },
              "TableName": "${table.tableName}"
            }`,
        },
      },
      service: 'dynamodb',
    });

    const methodOptions = { methodResponses: [{ statusCode: '200' }, { statusCode: '400' }, { statusCode: '500' }] };

    allResources.addMethod('GET', getAllIntegration, methodOptions);
    allResources.addMethod('POST', createIntegration, methodOptions);

    oneResource.addMethod('DELETE', deleteIntegration, methodOptions);
    oneResource.addMethod('GET', getIntegration, methodOptions);
    oneResource.addMethod('PUT', updateIntegration, methodOptions);

    const rg = new resourceGroup.CfnGroup(this, `resource-group`, {
      name: `${environ.valueAsString}-${project.valueAsString}-resource-group`,
      description: 'Resource group for the project',
      resourceQuery: {
        type: 'CLOUDFORMATION_STACK_1_0',
      }
    })

    new cdk.CfnOutput(this, 'resource-group-arn', {
      value: rg.attrArn,
      description: 'The name of the resource group',
      exportName: `${environ.valueAsString}-${project.valueAsString}-resource-group-arn`,
    })

  }
}
