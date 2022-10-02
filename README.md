---
title: Introduction to Appsync
author: haimtran
publishedDate: 01/10/2022
date: 01/10/2022
---

## Introduction

[GitHub](https://github.com/cdk-entest/appsync-ddb) shows a basic example how to create and use an appsync api with a dynamodb table behind. [Amplify GraphQL](https://github.com/cdk-entest/appsync-ddb) for faster development and [Amplify Sandbox](https://sandbox.amplifyapp.com/)

- create appsync app, api key and schema (frontend)
- create datasource, resolvers (backend)

## Frontend

I mean what web/app developers see and use appsync api. What they see is data models and how to call the api

create an appsync app

```tsx
const itemsGraphQLApi = new aws_appsync.CfnGraphQLApi(this, "ItemsApi", {
  name: "items-api",
  authenticationType: "API_KEY",
});
```

create an api key

```tsx
new aws_appsync.CfnApiKey(this, "ItemsApiKey", {
  apiId: itemsGraphQLApi.attrApiId,
});
```

schema

```tsx
const apiSchema = new aws_appsync.CfnGraphQLSchema(this, "ItemsSchema", {
  apiId: itemsGraphQLApi.attrApiId,
  definition: `type ${tableName}{
        ${tableName}Id: ID!, 
        name: String
      }
      type Query {
        getOne(${tableName}Id: ID!): ${tableName}
      }
      type Schema  {
        query: Query
      }
      `,
});
```

## Backend

what a backend engineer see and define

create a dynamodb table

```tsx
const itemsTable = new aws_dynamodb.Table(this, "ItemsTable", {
  tableName: tableName,
  partitionKey: {
    name: `${tableName}Id`,
    type: aws_dynamodb.AttributeType.STRING,
  },
  removalPolicy: RemovalPolicy.DESTROY,
});
```

appsync datasource

```tsx
// appsync datasource
const role = new aws_iam.Role(this, "ItemsDynamoDBRole", {
  assumedBy: new aws_iam.ServicePrincipal("appsync.amazonaws.com"),
  roleName: "ItemsDynamoDBRole",
});

role.addManagedPolicy(
  aws_iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonDynamoDBFullAccess")
);

const dataSource = new aws_appsync.CfnDataSource(this, "ItemsDataSource", {
  apiId: itemsGraphQLApi.attrApiId,
  name: "ItemsDataSource",
  type: "AMAZON_DYNAMODB",
  dynamoDbConfig: {
    tableName: itemsTable.tableName,
    awsRegion: this.region,
  },
  serviceRoleArn: role.roleArn,
});
```

create resolver and mapping

```tsx
const getOneResolver = new aws_appsync.CfnResolver(this, "GetOneResolver", {
  apiId: itemsGraphQLApi.attrApiId,
  typeName: "Query",
  fieldName: "getOne",
  dataSourceName: dataSource.name,
  requestMappingTemplate: `{
        "version": "2017-02-28",
        "operation": "GetItem",
        "key": {
          "${tableName}Id": $util.dynamodb.toDynamoDBJson($ctx.args.${tableName}Id)
        }
      }`,
  responseMappingTemplate: `$util.toJson($ctx.result)`,
});
```

dependen on

```tsx
getOneResolver.addDependsOn(apiSchema);
getOneResolver.addDependsOn(dataSource);
```
