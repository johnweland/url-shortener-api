import { StackProps } from "aws-cdk-lib";

export interface ICoreStackProps extends StackProps {
  project: string;
  stage: string;
  tags?: {
    [key: string]: string;
  }
}

export interface IApiStackProps extends ICoreStackProps {
  lambdas: ILambda[];
}
export interface ILambda {
  name: string;
  handler: string;
  memorySize: number;
  actions: string[];
} 