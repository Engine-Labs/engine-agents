import * as dotenv from "dotenv";
dotenv.config();

import { Team } from "../src/team";
import { TeamLeader } from "../src/teamLeader";
import { TeamMember } from "../src/teamMember";

async function researchGroupChat() {
  const engineer = new TeamMember(
    "Engineer",
    `You follow an approved plan. You write python/shell code to solve tasks. Wrap the code in a code block that specifies the script type. The user can't modify your code. So do not suggest incomplete code which requires others to modify. Don't use a code block if it's not intended to be executed by the executor.
Don't include multiple code blocks in one response. Do not ask others to copy and paste the result. Check the execution result returned by the executor.
If the result indicates there is an error, fix the error and output the code again. Suggest the full code instead of partial code or code changes. If the error can't be fixed or if the task is not solved even after the code is executed successfully, analyze the problem, revisit your assumption, collect additional info you need, and think of a different approach to try.`,
    {
      enabled: true,
      workingDirectory: __dirname,
    }
  );

  const scientist = new TeamMember(
    "Scientist",
    `Scientist. You follow an approved plan. You are able to categorize papers after seeing their abstracts printed. You don't write code.`
  );

  const critic = new TeamMember(
    "Critic",
    `Critic. Double check plan, claims, code from other agents and provide feedback. Check whether the plan includes adding verifiable info such as source URL.`
  );

  const planner = new TeamLeader(
    "Planner",
    `Planner. Suggest a plan. Revise the plan based on feedback from admin and critic, until admin approval.
The plan may involve an engineer who can write code and a scientist who doesn't write code.
Explain the plan first. Be clear which step is performed by an engineer, and which step is performed by a scientist.`
  );

  async function handleStateUpdate(teamState: any) {
    // uncomment to see intermediate states
    // console.log(JSON.stringify(teamState));
  }

  const team = new Team(
    planner,
    [engineer, scientist, critic],
    handleStateUpdate
  );

  const chat = await team.chat(
    "Find papers on LLM applications from arxiv in the last week, create a markdown table of different domains."
  );

  console.log(chat);
}

researchGroupChat();
