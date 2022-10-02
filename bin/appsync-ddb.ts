#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { AppsyncDDBStack } from "../lib/appsync-ddb-stack";

const app = new cdk.App();
new AppsyncDDBStack(app, "AppsyncDDBStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1",
  },
});

