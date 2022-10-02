import {
  Stack,
  StackProps,
  aws_dynamodb,
  RemovalPolicy,
  aws_appsync,
  aws_iam,
} from "aws-cdk-lib";
import { Construct } from "constructs";

export class AppsyncDDBStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const tableName = "ItemsTable";

    // =========================Frontend=========================
    // appsync app
    const itemsGraphQLApi = new aws_appsync.CfnGraphQLApi(this, "ItemsApi", {
      name: "items-api",
      authenticationType: "API_KEY",
    });

    // api key
    new aws_appsync.CfnApiKey(this, "ItemsApiKey", {
      apiId: itemsGraphQLApi.attrApiId,
    });

    // schema
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

    // =========================Backend=========================
    // ddb table
    const itemsTable = new aws_dynamodb.Table(this, "ItemsTable", {
      tableName: tableName,
      partitionKey: {
        name: `${tableName}Id`,
        type: aws_dynamodb.AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY,
    });

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

    // get one item resolver
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

    getOneResolver.addDependsOn(apiSchema);
    getOneResolver.addDependsOn(dataSource);
  }
}
