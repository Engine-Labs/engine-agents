import * as dotenv from "dotenv";
dotenv.config();

import { TeamLeader, TeamMember } from "../src/teamMembers";
import { Team } from "../src/team";

async function run() {
  const assistant = new TeamLeader(
    "Team Lead",
    `You are the team lead of a small team.
Your software engineer can write Python scripts and save them to file, and your test engineer can run them and report the results.`
  );

  const softwareEngineer = new TeamMember(
    "Software Engineer",
    "You write simple Python scripts and save them to file. Put any requirements in a requirements.txt file.",
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
            required: ["filename", "content"],
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
          fs.writeFileSync(args.filename, args.content);
          return `Saved script to ${args.filename}`;
        },
      },
    }
  );

  const testEngineer = new TeamMember(
    "Test Engineer",
    "You install requirements if necessary and execute Python scripts to test them and provide feedback on the results.",
    {
      enabled: false,
      workingDirectory: "",
    },
    {
      run_python_file: {
        schema: {
          name: "run_python_file",
          description: "Run a Python file",
          parameters: {
            type: "object",
            required: ["filename"],
            properties: {
              filename: {
                type: "string",
              },
            },
          },
        },
        function: async function run_python_file(args: { filename: string }) {
          const { exec } = require("child_process");
          const { promisify } = require("util");
          const execAsync = promisify(exec);
          try {
            const { stdout, stderr } = await execAsync(
              `python3 ${args.filename}`
            );
            return stdout;
          } catch (e) {
            const error = e as any;
            return error.stderr;
          }
        },
      },
      install_requirements: {
        schema: {
          name: "install_requirements",
          description: "Install Python requirements from file with pip",
          parameters: {
            type: "object",
            required: ["filename"],
            properties: {
              filename: {
                type: "string",
              },
            },
          },
        },
        function: async function install_requirements(args: { filename: string }) {
          const { exec } = require("child_process");
          const { promisify } = require("util");
          const execAsync = promisify(exec);
          try {
            const { stdout, stderr } = await execAsync(
              `pip3 install -r ${args.filename}`
            );
            return stdout;
          } catch (e) {
            const error = e as any;
            return error.stderr;
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
    [softwareEngineer, testEngineer],
    handleStateUpdate
  );

  const teamState = team.getState();
  console.log(JSON.stringify(teamState));

  const restoredTeam = Team.fromState(teamState);

  const chat = await restoredTeam.chat(
    "Could you please write a Python script that gets my IP address?"
  );
  console.log(chat);
}

run();
