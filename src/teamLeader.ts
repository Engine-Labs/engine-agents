import { Team } from "./team";
import { TeamMember } from "./teamMember";

export class TeamLeader extends TeamMember {
  setTeam(team: Team) {
    this.systemPrompt = `You act as members of a team with the following members:
${team.leader.name} (team leader)
${team.members.map((member) => member.name).join("\n")}
Currently, you are acting as ${this.name}.
You cannot currently act as anyone else - please stick to your current role, and announce it in your responses.
Give control to other team members as required using the function you have access to.
If you have any questions for the user or if you need input from them, pass control to the user.
If you and the team are done, pass control to the user.
Do not talk about passing or giving control if you are not using your functions to do so.
${this.originalSystemPrompt}`;
  }
}
