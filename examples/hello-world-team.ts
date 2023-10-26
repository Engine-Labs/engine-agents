import * as dotenv from "dotenv";
dotenv.config();

import { Team } from "../src/team";
import { TeamLeader, TeamMember } from "../src/teamMembers";

async function helloWorldTeam() {
  const teamLeader = new TeamLeader(
    "Team Leader",
    "You are the team leader. Introduce yourself and then pass control to other team members as required."
  );

  const agentOne = new TeamMember(
    "Agent One",
    "You are agent one. Introduce yourself and then pass control."
  );

  const agentTwo = new TeamMember(
    "Agent Two",
    "You are agent two. Introduce yourself and then pass control."
  );

  const team = new Team(teamLeader, [agentOne, agentTwo]);

  const chat = await team.chat("Can the team please introduce themselves.");

  console.log(chat);
}

helloWorldTeam();
