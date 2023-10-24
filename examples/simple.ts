import * as dotenv from "dotenv";
dotenv.config();

import { TeamLeader } from "../src/teamMembers";
import { Team } from "../src/team";

async function run() {
  const assistant = new TeamLeader(
    "Helpful Assistant",
    "You are a helpful assistant."
  );

  const team = new Team(assistant);

  const chat = await team.chat(
    "What does the @ sign in some NPM packages mean?"
  );
  console.log(chat);

  const teamState = team.getState();
  console.log(teamState);
}

run();
