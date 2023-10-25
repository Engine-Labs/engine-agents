import { TeamMember, TeamLeader } from "./teamMembers";
import { HUMAN_USER_NAME } from "./constants";
import { MemberResponse, Message, TeamState } from "./types/chat";
import { parseWithFns } from "./parsers";

const MAX_ITERATIONS = 10; // Arbitrary limit for the event loop
export class Team {
  leader: TeamLeader;
  members: TeamMember[];

  constructor(leader: TeamLeader, members: TeamMember[] = []) {
    this.leader = leader;
    this.members = members;
    this.initializeTeam();
  }

  initializeTeam(): void {
    this.leader.setTeam(this);
    this.members.forEach((member) => member.setTeam(this));
  }

  async chat(message: string): Promise<Message[]> {
    let iterationCount = 0;

    // Broadcast message to all team members and team leader
    this.broadcastMessage(HUMAN_USER_NAME, message);

    let teamMember: TeamMember = this.leader;
    let memberResponse = await teamMember.getResponse();

    while (memberResponse.nextTeamMember !== HUMAN_USER_NAME) {
      if (++iterationCount > MAX_ITERATIONS) {
        throw new Error("Exceeded maximum allowed iterations in chat loop");
      }

      if (memberResponse.response) {
        this.broadcastMessage(
          memberResponse.responder,
          memberResponse.response
        );
        const codeBlocksResults = await teamMember.handleCodeBlocks(
          memberResponse.response
        );
        if (codeBlocksResults) {
          this.broadcastMessage(HUMAN_USER_NAME, codeBlocksResults);
          memberResponse = await teamMember.getResponse();
          continue;
        }
      }
      teamMember = this.getMemberForNextResponse(memberResponse, teamMember);
      memberResponse = await teamMember.getResponse();
    }

    // Filter out messages not from the team leader or human
    return this.leader.messages.filter((msg) =>
      [this.leader.name, HUMAN_USER_NAME].includes(msg.sender)
    );
  }

  private getMemberForNextResponse(
    memberResponse: MemberResponse,
    currentTeamMember: TeamMember
  ): TeamMember {
    // If there's no specified member, it's the current member's turn again
    if (!memberResponse.nextTeamMember) {
      return currentTeamMember;
    }
    return this.getMemberByName(memberResponse.nextTeamMember);
  }

  private broadcastMessage(senderName: string, message: string): void {
    [this.leader, ...this.members].forEach((member) =>
      member.addMessage(senderName, message)
    );
  }

  private getMemberByName(name: string): TeamMember {
    if (name === this.leader.name) {
      return this.leader;
    }

    const teamMember = this.members.find((member) => member.name === name);
    if (!teamMember) {
      throw new Error(`Team member with name ${name} not found.`);
    }
    return teamMember;
  }

  static fromState(state: TeamState) {
    const teamLeader = new TeamLeader(
      state.teamLeader.name,
      state.teamLeader.systemPrompt,
      state.teamLeader.codeExecutionConfig,
      parseWithFns(state.teamLeader.functionConfig)
    );
    teamLeader.messages = state.teamLeader.messages;

    const teamMembers = state.members.map((member) => {
      const newMember = new TeamMember(
        member.name,
        member.systemPrompt,
        member.codeExecutionConfig,
        parseWithFns(member.functionConfig)
      );
      newMember.messages = member.messages;
      return newMember;
    });

    return new Team(teamLeader, teamMembers);
  }

  getState(): TeamState {
    return {
      teamLeader: this.leader.getState(),
      members: this.members.map((member) => member.getState()),
    };
  }
}
