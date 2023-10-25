import OpenAI from "openai";
import { EXECUTOR, HUMAN_USER_NAME } from "./constants";
import { parseWithFns } from "./parsers";
import { TeamLeader, TeamMember } from "./teamMembers";
import { MemberResponse, Message, TeamState } from "./types";

const MAX_ITERATIONS = 10; // Arbitrary limit for the event loop

type StateHandler = (state: TeamState) => void;
export class Team {
  leader: TeamLeader;
  members: TeamMember[];
  everyone: TeamMember[];
  stateHandler: StateHandler;

  constructor(
    leader: TeamLeader,
    members: TeamMember[] = [],
    stateHandler?: StateHandler
  ) {
    this.leader = leader;
    this.members = members;
    this.everyone = [this.leader, ...this.members];

    this.stateHandler = stateHandler || ((state) => {});

    this.initializeTeam();
  }

  initializeTeam(): void {
    this.everyone.forEach((member) => member.setTeam(this));
    this.everyone.forEach((member) => {
      member.addFunctionConfig({
        schemas: [this.getPassControlSchema()],
        functions: {
          pass_control: function () {}, // special case used to pass control to another team member
        },
      });
    });
  }

  getPassControlSchema(): OpenAI.Chat.Completions.ChatCompletionCreateParams.Function {
    return {
      name: "pass_control",
      description: "Pass control to a team member.",
      parameters: {
        type: "object",
        required: ["teamMember"],
        properties: {
          teamMember: {
            type: "string",
            enum: [
              HUMAN_USER_NAME,
              ...this.everyone.map((member) => member.name),
            ],
            description: "The team member to pass control to.",
          },
        },
      },
    };
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
          this.broadcastMessage(EXECUTOR, codeBlocksResults);
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
    this.everyone.forEach((member) => member.addMessage(senderName, message));

    this.stateHandler(this.getState());
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
