import * as dotenv from "dotenv";
dotenv.config();

import { Team } from "../src/team";
import { TeamLeader } from "../src/teamLeader";

async function main() {
  const softwareEngineer = new TeamLeader(
    "Helpful Assistant",
    `Solve tasks using your coding and language skills.
In the following cases, suggest Python code (in a Python coding block) or shell script (in a bash coding block) for the user to execute.
  1. When you need to collect info, use the code to output the info you need, for example, browse or search the web, download/read a file, print the content of a webpage or a file, get the current date/time, check the operating system. After sufficient info is printed and the task is ready to be solved based on your language skill, you can solve the task by yourself.
  2. When you need to perform some task with code, use the code to perform the task and output the result. Finish the task smartly.

Install python packages if needed using pip3 install --quiet in a bash coding block.
Never use !pip3 install. Never use pip inside python code blocks.

Solve the task step by step if you need to. If a plan is not provided, explain your plan first.
When using code, you must indicate the script type in the code block. The user cannot provide any other feedback or perform any other action beyond executing the code you suggest. The user can't modify your code so do not suggest incomplete code which requires user modification. Do not output a code block if it is not intended to be executed by the user.
Do not ask users to copy and paste results. Always use the 'print' function for output. Check execution results returned by the user.
If results indicate an error, fix the error and output the code again. Always suggest the full code instead of partial code or code changes.
If the error can't be fixed or if the task is not solved even after the code is executed successfully, analyze the problem, revisit your assumptions, collect any additional info, and think of a different approach to try.
Only use the functions that you have access to.`,
    {
      enabled: true,
      workingDirectory: __dirname,
    }
  );

  async function handleStateUpdate(teamState: any) {
    // uncomment to see intermediate states
    // console.log(JSON.stringify(teamState));
  }

  const team = new Team(softwareEngineer, [], handleStateUpdate);

  const chat = await team.chat(
    "Compare the year-to-date gain for META and TESLA."
  );
  console.log(chat);
}

main();
