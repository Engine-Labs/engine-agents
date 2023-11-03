import OpenAI from "openai";
import {
  EXECUTOR,
  PASS_TO_USER,
  GIVE_BACK_CONTROL,
  GIVE_CONTROL,
  HUMAN_USER_NAME,
  MAX_ITERATIONS,
  TEAM_LEADER,
} from "./constants";
import { parseWithFns } from "./parsers";
import { TeamLeader, TeamMember } from "./teamMembers";
import { MemberResponse, Message, TeamState } from "./types";

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
    this.members.forEach((member) => {
      member.addFunctionConfig(GIVE_BACK_CONTROL, {
        schema: this.giveBackControlSchema(),
        function: async function () {},
      });
    });
    this.leader.addFunctionConfig(GIVE_CONTROL, {
      schema: this.giveControlSchema(),
      function: async function () {},
    });
    this.leader.addFunctionConfig(PASS_TO_USER, {
      schema: this.passToUserSchema(),
      function: async function () {},
    });
  }

  giveBackControlSchema(): OpenAI.Chat.Completions.ChatCompletionCreateParams.Function {
    return {
      name: GIVE_BACK_CONTROL,
      description:
        "Give back chat control to the team leader when you are done.",
      parameters: {
        type: "object",
        required: [],
        properties: {},
      },
    };
  }

  giveControlSchema(): OpenAI.Chat.Completions.ChatCompletionCreateParams.Function {
    return {
      name: GIVE_CONTROL,
      description: "Give control of the chat to another team member.",
      parameters: {
        type: "object",
        required: ["teamMember"],
        properties: {
          teamMember: {
            type: "string",
            enum: this.members.map((member) => member.name),
          },
        },
      },
    };
  }

  passToUserSchema(): OpenAI.Chat.Completions.ChatCompletionCreateParams.Function {
    return {
      name: PASS_TO_USER,
      description: "Pass control of the chat to the human user.",
      parameters: {
        type: "object",
        required: [],
        properties: {},
      },
    };
  }

  addStateHandler(stateHandler: StateHandler): void {
    this.stateHandler = stateHandler;
  }

  async handleResponse(
    memberResponse: MemberResponse,
    teamMember: TeamMember
  ): Promise<MemberResponse | null> {
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
        return await teamMember.getResponse();
      }
    }
    return null;
  }

  async getAndHandleResponse(
    teamMember: TeamMember,
    canPassControl: boolean
  ): Promise<MemberResponse> {
    let memberResponse = await teamMember.getResponse(canPassControl);
    const newResponse = await this.handleResponse(memberResponse, teamMember);
    if (newResponse) {
      return newResponse;
    }
    return memberResponse;
  }

  async chat(message: string): Promise<Message[]> {
    await this.broadcastMessage(HUMAN_USER_NAME, message);

    let teamMember: TeamMember = this.leader;
    let memberResponse = await this.getAndHandleResponse(teamMember, false);

    let previousTeamMember: TeamMember | null = null;

    for (
      let iterationCount = 0;
      memberResponse.nextTeamMember !== HUMAN_USER_NAME &&
      iterationCount <= MAX_ITERATIONS;
      iterationCount++
    ) {
      previousTeamMember = teamMember;
      teamMember = this.getMemberForNextResponse(memberResponse, teamMember);

      // allow passing control only if the next teamMember is the same as the previous one
      const canPassControl = previousTeamMember === teamMember;

      memberResponse = await this.getAndHandleResponse(
        teamMember,
        canPassControl
      );
    }

    await this.handleResponse(memberResponse, teamMember);

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

    if (memberResponse.nextTeamMember === TEAM_LEADER) {
      return this.leader;
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
      // TODO: handle more gracefully? sometimes the team member is just 'user'
      //       so we could special case handle it if it appears more frequently
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
