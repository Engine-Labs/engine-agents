import * as dotenv from "dotenv";
dotenv.config();

import { TeamLeader } from "../src/teamMembers";
import { Team } from "../src/team";

async function startAndResume() {
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

  // A team can be basically fully restored from its state,
  // aside from any state handlers which you will need to re-attach
  const restoredTeam = Team.fromState(teamState);

  const continuedChat = await restoredTeam.chat(
    "How do I publish a package to NPM?"
  );

  console.log(continuedChat);
}

startAndResume();
