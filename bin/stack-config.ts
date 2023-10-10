import { IApiStackProps, ICoreStackProps, IDatabaseStackProps, ISharedInfraStackProps } from "./stack-config-types";

const coreStackProps: ICoreStackProps = {
  project: process.env.PROJECT || "url-shortner",
  stage: process.env.STAGE || "dev",
};

export {
  coreStackProps,
}