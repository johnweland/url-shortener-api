#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ApiStack } from '../lib/api-stack';
import { coreStackProps } from './stack-config';
import { DatabaseStack } from '../lib/database-stack';
import { ObservabilityStack } from '../lib/observability-stack';

const app = new cdk.App();

new DatabaseStack(app, `${coreStackProps.stage}-${coreStackProps.project}-database-stack`, {
  description: `Database deployment and configuration for the ${coreStackProps.project} micro-service`,
  ...coreStackProps
});
new ApiStack(app, `${coreStackProps.stage}-${coreStackProps.project}-api-stack`, {
  description: `API Gateway and Lambdas for the ${coreStackProps.project} micro-service`,
  ...coreStackProps
});

// new ObservabilityStack(app, `${coreStackProps.stage}-${coreStackProps.project}-observability-stack`, {
//   description: `Observability and monitoring for the ${coreStackProps.project} micro-service`,
//   ...coreStackProps,
// });
