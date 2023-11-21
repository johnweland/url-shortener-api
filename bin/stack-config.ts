import { ICoreStackProps, IApiStackProps } from "./stack-config-types";


const coreStackProps: ICoreStackProps = {
  project: process.env.PROJECT || "url-shortner",
  stage: process.env.STAGE || "dev",
};

const apiStackProps: IApiStackProps = {
  ...coreStackProps,
  apiKey: process.env.API_KEY || "sHozlahVmSnHuZEFdPaX2",
  lambdas: [
    {
      name: 'GET',
      handler: 'get_function.lambda_handler',
      memorySize: 128,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:Scan',
      ]
    },
    {
      name: 'POST',
      handler: 'post_function.lambda_handler',
      memorySize: 128,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:Scan',
        'dynamodb:PutItem',
      ]
    },
    {
      name: 'PUT',
      handler: 'put_function.lambda_handler',
      memorySize: 128,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:UpdateItem',
      ]
    },
    {
      name: 'PATCH',
      handler: 'patch_function.lambda_handler',
      memorySize: 128,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:UpdateItem',
      ]
    },
    {
      name: 'DELETE',
      handler: 'delete_function.lambda_handler',
      memorySize: 128,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:DeleteItem',
      ]
    },
  ]
}

export {
  coreStackProps,
  apiStackProps,
}