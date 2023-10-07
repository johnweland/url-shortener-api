#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ApiStack } from '../lib/api-stack';
import { coreStackProps } from './stack-config';
import { DatabaseStack } from '../lib/database-stack';
import { ObservabilityStack } from '../lib/observability-stack';

const app = new cdk.App();

const observability = new ObservabilityStack(app, 'observability-stack', {
  description: `An observability stack for monitoring the ${coreStackProps.project} services`,
  ...coreStackProps,
  dashboard: null
});

new DatabaseStack(app, 'database-stack', {
  description: `A database stack for the ${coreStackProps.project} services`,
  ...coreStackProps,
  dashboard: observability.dashboard
});
new ApiStack(app, 'api-stack', coreStackProps);
