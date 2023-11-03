import OpenAI from "openai";
import {
  EXECUTOR,
  GIVE_BACK_CONTROL,
  GIVE_CONTROL,
  HUMAN_USER_NAME,
  MAX_ITERATIONS,
  PASS_TO_USER,
  TEAM_LEADER,
} from "./constants";
import { parseWithFns } from "./parsers";
import { TeamLeader } from "./teamLeader";
import { TeamMember } from "./teamMember";
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
    if (this.members.length > 0) {
      this.leader.addFunctionConfig(GIVE_CONTROL, {
        schema: this.giveControlSchema(),
        function: async function () {},
      });
    }
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
  ): Promise<void> {
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
  }

  async getAndHandleResponse(
    teamMember: TeamMember,
    canPassControl: boolean
  ): Promise<MemberResponse> {
    let memberResponse = await teamMember.getResponse(canPassControl);
    await this.handleResponse(memberResponse, teamMember);
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
      teamMember = await this.getMemberForNextResponse(
        memberResponse,
        teamMember
      );

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

  async getMemberForNextResponse(
    memberResponse: MemberResponse,
    currentTeamMember: TeamMember
  ): Promise<TeamMember> {
    const nextMemberName = memberResponse.nextTeamMember;

    // If there's no specified member, it's the current member's turn again
    if (!nextMemberName) {
      return currentTeamMember;
    }

    if (nextMemberName === TEAM_LEADER || nextMemberName === this.leader.name) {
      return this.leader;
    }

    const teamMember = this.members.find(
      (member) => member.name === nextMemberName
    );
    if (!teamMember) {
      let message = `No such team member exists: ${nextMemberName}.
Please choose from one of the following team members:
${this.members.map((member) => member.name).join("\n")}`;

      await this.broadcastMessage(EXECUTOR, message);
      return currentTeamMember;
    }
    return teamMember;
  }

  async broadcastMessage(senderName: string, message: string): Promise<void> {
    this.everyone.forEach((member) => member.addMessage(senderName, message));
    await this.stateHandler(this.getState());
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
