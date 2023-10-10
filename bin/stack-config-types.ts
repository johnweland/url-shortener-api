import { StackProps } from "aws-cdk-lib";
import { EcsOptimizedImage } from "aws-cdk-lib/aws-ecs";

export interface ICoreStackProps extends StackProps {
  project: string;
  stage: string;
  dashboard?: any;
  tags?: {
    [key: string]: string;
  }
}

export interface ISharedInfraStackProps extends ICoreStackProps {
}

export interface IDatabaseStackProps extends ICoreStackProps {
  database: {
    name: string;
    username: string;
    password: string;
  }
}

export interface IApiStackProps extends ICoreStackProps {
  lambda: {
    name: string;
    runtime: string;
    handler: string;
    memorySize: number;
    timeout: number;
  },
  api: {
    name: string;
    desc: string;
    modelName: string;
    rootResource: string;
  },
  usagePlan: {
    name: string;
    desc: string;
    limit: number
    burstLimit: number;
    rateLimit: number;
  },
  apiKeys: {
    name: string;
    desc: string;
  },
  validators: {
    bodyValidator: IValidator;
    headerValidator: IValidator;
    paramsValidator: IValidator;
  }
}
export interface IValidator {
  requestValidatorName: string;
  validateRequestBody: boolean;
  validateRequestParameters: boolean;
}