import * as dotenv from "dotenv";
dotenv.config();

import { Team } from "../src/team";
import { TeamLeader } from "../src/teamLeader";
import { TeamMember } from "../src/teamMember";

async function cSuiteIntroductions() {
  const ceo = new TeamLeader("CEO", "");

  const cto = new TeamMember("CTO", "");

  const cfo = new TeamMember("CFO", "");

  const team = new Team(ceo, [cto, cfo]);

  const chat = await team.chat(
    "Could you please introduce yourselves one by one?"
  );

  console.log(chat);
}

cSuiteIntroductions();
