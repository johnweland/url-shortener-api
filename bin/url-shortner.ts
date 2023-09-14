#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SharedInfraStack } from '../lib/shared-infra-stack';
import { DatabaseStack } from '../lib/database-stack';
import { ApiStack } from '../lib/api-stack';

const app = new cdk.App();
new SharedInfraStack(app, 'shared-infra-stack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  }
});

new DatabaseStack(app, 'database-stack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  },
});

new ApiStack(app, 'api-stack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  },
});