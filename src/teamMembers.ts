import { executeCodeBlocks, extractCode } from "./codeExecution";
import {
  EXECUTOR,
  GIVE_BACK_CONTROL,
  GIVE_CONTROL,
  HUMAN_USER_NAME,
  FINISH_CHAT,
  TEAM_LEADER,
} from "./constants";
import { getCompletion } from "./llm";
import { stringifyWithFns } from "./parsers";
import { Team } from "./team";
import {
  CodeExecutionConfig,
  FunctionCall,
  FunctionCallOption,
  FunctionConfig,
  FunctionConfigBody,
  MemberResponse,
  MemberState,
  Message,
  isFunctionCall,
} from "./types";

export class TeamMember {
  name: string;
  systemPrompt: string;
  originalSystemPrompt: string;
  functionConfig: FunctionConfig;
  codeExecutionConfig: CodeExecutionConfig;
  messages: Message[] = [];

  constructor(
    name: string,
    systemPrompt: string,
    codeExecutionConfig: CodeExecutionConfig = {
      enabled: false,
      workingDirectory: "",
    },
    functionConfig?: FunctionConfig
  ) {
    this.name = name;
    this.systemPrompt = systemPrompt;
    this.originalSystemPrompt = systemPrompt;
    this.codeExecutionConfig = codeExecutionConfig;
    this.functionConfig = functionConfig || {};
  }

  addMessage(sender: string, message: string) {
    this.messages.push({ sender: sender, content: message });
  }

  addFunctionConfig(name: string, config: FunctionConfigBody) {
    this.functionConfig[name] = config;
  }

  setTeam(team: Team) {
    this.systemPrompt = `${this.originalSystemPrompt}
You take in turns to act as members of a team with the following members:
${team.leader.name} (team leader)
${team.members.map((member) => member.name).join("\n")}
Currently, you are acting as ${this.name}.
You announce who you are in your responses.`;
  }

  async getResponse(force: boolean = false): Promise<MemberResponse> {
    let functionCall = force ? "none" : "auto";
    let completion = await getCompletion(
      this.name,
      this.systemPrompt,
      this.messages,
      this.functionConfig,
      functionCall as FunctionCallOption
    );

    // Handle function calling appearing in body of completion
    if (typeof completion === "string" && !force) {
      if (completion.includes(GIVE_BACK_CONTROL)) {
        completion = await getCompletion(
          this.name,
          this.systemPrompt,
          this.messages,
          this.functionConfig,
          { name: GIVE_BACK_CONTROL }
        );
      } else if (completion.includes(GIVE_CONTROL)) {
        completion = await getCompletion(
          this.name,
          this.systemPrompt,
          this.messages,
          this.functionConfig,
          { name: GIVE_CONTROL }
        );
      } else if (completion.includes(FINISH_CHAT)) {
        completion = await getCompletion(
          this.name,
          this.systemPrompt,
          this.messages,
          this.functionConfig,
          { name: FINISH_CHAT }
        );
      }
    }

    if (!completion) {
      throw new Error("No completion available");
    }

    if (typeof completion === "object" && isFunctionCall(completion)) {
      return await this.handleFunctionCall(completion);
    }

    return {
      nextTeamMember: null,
      responder: this.name,
      response: completion,
    };
  }

  async handleCodeBlocks(completion: string): Promise<string | null> {
    const codeBlocks = extractCode(completion);
    if (codeBlocks.length > 0 && this.codeExecutionConfig.enabled) {
      return await executeCodeBlocks(codeBlocks, this.codeExecutionConfig);
    } else {
      return null;
    }
  }

  async handleFunctionCall({
    name,
    arguments: args,
    content,
  }: FunctionCall): Promise<MemberResponse> {
    // Handle pass control function as a special case
    if (name === GIVE_BACK_CONTROL) {
      return {
        nextTeamMember: TEAM_LEADER,
        responder: this.name,
        response: content,
      };
    } else if (name === GIVE_CONTROL) {
      return {
        nextTeamMember: args.teamMember,
        responder: this.name,
        response: content,
      };
    } else if (name === FINISH_CHAT) {
      return {
        nextTeamMember: HUMAN_USER_NAME,
        responder: this.name,
        response: content,
      };
    }

    if (!(name in this.functionConfig)) {
      return {
        nextTeamMember: null,
        responder: this.name,
        response: `No such function: ${name}`,
      };
    }

    const functionResult = this.functionConfig[name].function(args);

    return {
      nextTeamMember: null,
      responder: EXECUTOR,
      response: functionResult,
    };
  }

  getState(): MemberState {
    return {
      name: this.name,
      systemPrompt: this.originalSystemPrompt,
      messages: this.messages,
      functionConfig: stringifyWithFns(this.functionConfig),
      codeExecutionConfig: this.codeExecutionConfig,
    };
  }
}

export class TeamLeader extends TeamMember {
  setTeam(team: Team) {
    this.systemPrompt = `${this.originalSystemPrompt}
You take in turns to act as members of a team with the following members:
${team.leader.name} (team leader)
${team.members.map((member) => member.name).join("\n")}
Currently, you are acting as the team leader, ${this.name}.
You announce who you are in your responses.
Delegate to other team members as required.
Finish the chat when the team are done.`;
  }
}
