import * as dotenv from "dotenv";
dotenv.config();

import { TeamLeader, TeamMember } from "../src/teamMembers";
import { Team } from "../src/team";

async function run() {
  const assistant = new TeamLeader(
    "Team Lead",
    `You are the team lead of a small team.
Your software engineer can write AWS Lambda functions in Python, and your DevOps engineer can deploy them.
Think step by step and plan ahead.`
  );

  const softwareEngineer = new TeamMember(
    "Software Engineer",
    `You write simple Python AWS Lambda functions and can save them to file.
Save Lambda function code to a file called lambda_function.py.
The entrypoint should be 'def lambda_handler(event, context):',
Put any requirements in a requirements.txt file.`,
    {
      enabled: false,
      workingDirectory: "",
    },
    {
      save_file: {
        schema: {
          name: "save_file",
          description: "Save content to file",
          parameters: {
            type: "object",
            required: ["content", "filename"],
            properties: {
              filename: {
                type: "string",
              },
              content: {
                type: "string",
              },
            },
          },
        },
        function: async function save_file(args: {
          filename: string;
          content: string;
        }) {
          const fs = require("fs");
          const directory = "/tmp/lambda";
          fs.mkdirSync(directory, { recursive: true });
          const filePath = `${directory}/${args.filename}`;
          fs.writeFileSync(filePath, args.content);
          return `Saved script to ${filePath}`;
        },
      },
    }
  );

  const devOpsEngineer = new TeamMember(
    "DevOps Engineer",
    "You can deploy Python AWS Lambda functions with any dependencies.",
    {
      enabled: false,
      workingDirectory: "",
    },
    {
      deploy_lambda_function: {
        schema: {
          name: "deploy_lambda_function",
          description: "Deploy a Python AWS Lambda function",
          parameters: {
            type: "object",
            required: ["functionName"],
            properties: {
              functionName: {
                type: "string",
              },
            },
          },
        },
        function: async function deploy_lambda_function(args: {
          functionName: string;
        }) {
          // requires AWS credentials in env vars and a predefined AWS execution role
          const executionRoleArn = process.env.AWS_LAMBDA_EXECUTION_ROLE_ARN;
          const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
          const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
          const awsRegion = process.env.AWS_REGION;
          const directory = "/tmp/lambda";

          const fs = require("fs");
          const { exec } = require("child_process");
          const { promisify } = require("util");
          const execAsync = promisify(exec);

          const {
            LambdaClient,
            CreateFunctionCommand,
            CreateFunctionUrlConfigCommand,
            AddPermissionCommand,
          } = require("@aws-sdk/client-lambda");

          const lambdaClient = new LambdaClient({
            credentials: {
              secretAccessKey: awsSecretAccessKey,
              accessKeyId: awsAccessKeyId,
            },
            region: awsRegion,
          });

          try {
            if (fs.existsSync(`${directory}/requirements.txt`)) {
              fs.mkdirSync(`${directory}/package`, { recursive: true });
              await execAsync(
                `pip3 install -r ${directory}/requirements.txt --target ${directory}/package`
              );
              await execAsync(
                `cd ${directory} && zip -r package.zip ./package`
              );
            }

            await execAsync(`cd ${directory} && zip package.zip ./*.py`);

            // TODO: what if functions have the same name?
            const params = {
              FunctionName: args.functionName,
              Runtime: "python3.11",
              Handler: "lambda_function.lambda_handler",
              Code: {
                ZipFile: fs.readFileSync(`${directory}/package.zip`),
              },
              Role: executionRoleArn,
            };
            const command = new CreateFunctionCommand(params);
            await lambdaClient.send(command);

            const addPermissionInput = {
              FunctionName: args.functionName,
              Action: "lambda:InvokeFunctionUrl",
              Principal: "*",
              StatementId: "FunctionURLAllowPublicAccess",
              FunctionUrlAuthType: "NONE",
            };

            const addPermissionCommand = new AddPermissionCommand(
              addPermissionInput
            );
            await lambdaClient.send(addPermissionCommand);

            const createFunctionUrlParams = {
              FunctionName: args.functionName,
              AuthType: "NONE",
            };
            const functionUrlCommand = new CreateFunctionUrlConfigCommand(
              createFunctionUrlParams
            );
            const functionUrlResponse = await lambdaClient.send(
              functionUrlCommand
            );

            return `Successfully deployed Lambda function. Function URL: ${functionUrlResponse.FunctionUrl}`;
          } catch (e) {
            const error = e as any;
            return `Failed to deploy Lambda function: ${error.stderr || error}`;
          }
        },
      },
    }
  );

  async function handleStateUpdate(teamState: any) {
    // console.log(JSON.stringify(teamState, null, 2));
  }

  const team = new Team(
    assistant,
    [softwareEngineer, devOpsEngineer],
    handleStateUpdate
  );

  const teamState = team.getState();
  console.log(JSON.stringify(teamState));

  const restoredTeam = Team.fromState(teamState);

  const chat = await restoredTeam.chat(
    "Could you please write and deploy a hello world lambda function?"
  );
  console.log(chat);
}

run();
