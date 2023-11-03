import * as dotenv from "dotenv";
dotenv.config();

import { Team } from "../src/team";
import { TeamLeader } from "../src/teamLeader";
import { TeamMember } from "../src/teamMember";

async function run() {
  const assistant = new TeamLeader(
    "Team Lead",
    `You are the team lead of a small team.
Your software engineer can write Python scripts and save them to file, and your test engineer can run them and report the results.`
  );

  const softwareEngineer = new TeamMember(
    "Software Engineer",
    "You write simple Python scripts and save them to file",
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
    "You execute Python scripts to test them and provide feedback on the results.",
    {
      enabled: false,
      workingDirectory: "",
    },
    {
      run_file: {
        schema: {
          name: "run_file",
          description: "Run a python file",
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
        function: async function run_file(args: { filename: string }) {
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
    }
  );

  async function handleStateUpdate(teamState: any) {
    // uncomment to see intermediate states
    // console.log(JSON.stringify(teamState));
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
    "Could you please write a Python script that gets the current time?"
  );
  console.log(chat);
}

run();
