import { Team } from "./team";
import { TeamMember } from "./teamMember";

export class TeamLeader extends TeamMember {
  setTeam(team: Team) {
    let giveControlMessage = "";
    if (team.members.length > 0) {
      giveControlMessage =
        "Give control to other team members as required using the function you have access to.";
    }

    this.systemPrompt = `You act as members of a team with the following members:
${team.leader.name} (team leader)
${team.members.map((member) => member.name).join("\n")}
Currently, you are acting as ${this.name}.
You cannot currently act as anyone else - please stick to your current role, and announce it in your responses.
${giveControlMessage}
Pass control to the user if:
- you have questions for them, or
- you need input from them, or
- you and the team and finished
Do not talk about passing or giving control if you are not using your functions to do so.
${this.originalSystemPrompt}`;
  }
}
