import { ICoreStackProps, IApiStackProps } from "./stack-config-types";


const coreStackProps: ICoreStackProps = {
  project: process.env.PROJECT || "url-shortner",
  stage: process.env.STAGE || "dev",
};

const apiStackProps: IApiStackProps = {
  ...coreStackProps,
  lambdas: [
    {
      name: 'GET',
      handler: 'get_function.lambda_handler',
      memorySize: 128,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:Scan',
        'dynamodb:UpdateItem'
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
        'dynamodb:PutItem',
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