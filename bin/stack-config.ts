import { IApiStackProps, ICoreStackProps, IDatabaseStackProps, ISharedInfraStackProps } from "./stack-config-types";

const coreStackProps: ICoreStackProps = {
  project: "url-shortner",
  stage: "dev",
};

export {
  coreStackProps,
}