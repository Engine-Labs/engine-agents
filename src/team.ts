import OpenAI from "openai";
import { EXECUTOR, HUMAN_USER_NAME } from "./constants";
import { parseWithFns } from "./parsers";
import { TeamLeader, TeamMember } from "./teamMembers";
import { MemberResponse, Message, TeamState } from "./types";

const MAX_ITERATIONS = 30; // Arbitrary limit for the event loop

type StateHandler = (state: TeamState) => Promise<void>;
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

    this.stateHandler = stateHandler || (async (_state) => {});

    this.initializeTeam();
  }

  initializeTeam(): void {
    this.everyone.forEach((member) => member.setTeam(this));
    this.everyone.forEach((member) => {
      member.addFunctionConfig({
        pass_control: {
          schema: this.getPassControlSchema(member),
          function: function () {},
        },
      });
    });
  }

  getPassControlSchema(
    member: TeamMember
  ): OpenAI.Chat.Completions.ChatCompletionCreateParams.Function {
    return {
      name: "pass_control",
      description: "Pass control to another team member when finished.",
      parameters: {
        type: "object",
        required: ["teamMember"],
        properties: {
          teamMember: {
            type: "string",
            enum: [
              HUMAN_USER_NAME,
              ...this.everyone
                .map((member) => member.name)
                .filter((memberName) => memberName !== member.name),
            ],
            description: "The team member to pass control to.",
          },
        },
      },
    };
  }

  addStateHandler(stateHandler: StateHandler): void {
    this.stateHandler = stateHandler;
  }

  async chat(message: string): Promise<Message[]> {
    let iterationCount = 0;

    // Broadcast message to all team members and team leader
    await this.broadcastMessage(HUMAN_USER_NAME, message);

    let teamMember: TeamMember = this.leader;
    let memberResponse = await teamMember.getResponse();

    while (memberResponse.nextTeamMember !== HUMAN_USER_NAME) {
      if (iterationCount > MAX_ITERATIONS) {
        break;
      }

      if (memberResponse.response) {
        // Only increase iteration count if there was a response
        iterationCount = iterationCount + 1;

        await this.broadcastMessage(
          memberResponse.responder,
          memberResponse.response
        );
        const codeBlocksResults = await teamMember.handleCodeBlocks(
          memberResponse.response
        );
        if (codeBlocksResults) {
          await this.broadcastMessage(EXECUTOR, codeBlocksResults);
          memberResponse = await teamMember.getResponse();
          continue;
        }
      }
      teamMember = this.getMemberForNextResponse(memberResponse, teamMember);
      memberResponse = await teamMember.getResponse();
    }

    // Broadcast final message to all team members and team leader if there is a response
    if (memberResponse.response) {
      await this.broadcastMessage(
        memberResponse.responder,
        memberResponse.response
      );
      const codeBlocksResults = await teamMember.handleCodeBlocks(
        memberResponse.response
      );
      if (codeBlocksResults) {
        await this.broadcastMessage(EXECUTOR, codeBlocksResults);
      }
    }

    return this.leader.messages;
  }

  getMemberForNextResponse(
    memberResponse: MemberResponse,
    currentTeamMember: TeamMember
  ): TeamMember {
    // If there's no specified member, it's the current member's turn again
    if (!memberResponse.nextTeamMember) {
      return currentTeamMember;
    }
    return this.getMemberByName(memberResponse.nextTeamMember);
  }

  async broadcastMessage(senderName: string, message: string): Promise<void> {
    this.everyone.forEach((member) => member.addMessage(senderName, message));
    await this.stateHandler(this.getState());
  }

  getMemberByName(name: string): TeamMember {
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
