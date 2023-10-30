import * as dotenv from "dotenv";
dotenv.config();

import { Team } from "../src/team";
import { TeamLeader, TeamMember } from "../src/teamMembers";

async function cSuiteIntroductions() {
  const ceo = new TeamLeader("CEO", "");

  const cto = new TeamMember("CTO", "");

  const cfo = new TeamMember("CFO", "");

  const team = new Team(ceo, [cto, cfo]);

  const chat = await team.chat("Could you please introduce yourselves one by one?");

  console.log(chat);
}

cSuiteIntroductions();
