import { executeCodeBlocks, extractCode } from "./codeExecution";
import { HUMAN_USER_NAME } from "./constants";
import { getCompletion } from "./llm";
import { stringifyWithFns } from "./parsers";
import { Team } from "./team";
import {
  CodeExecutionConfig,
  FunctionCall,
  FunctionConfig,
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

  addFunctionConfig(functionConfig: FunctionConfig) {
    this.functionConfig = {
      ...this.functionConfig,
      ...functionConfig,
    };
  }

  setTeam(team: Team) {
    this.systemPrompt = `${this.originalSystemPrompt}
Your team has the following members:
${HUMAN_USER_NAME}
${team.leader.name}
${team.members.map((member) => member.name).join("\n")}
You are the ${this.name}.
`;
  }

  async getResponse(): Promise<MemberResponse> {
    const completion = await getCompletion(
      this.name,
      this.systemPrompt,
      this.messages,
      this.functionConfig
    );

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
    if (name === "pass_control") {
      return {
        nextTeamMember: args.teamMember,
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
      responder: HUMAN_USER_NAME,
      response: JSON.stringify(functionResult),
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
  team: Team | null = null;

  setTeam(team: Team) {
    this.systemPrompt = `${this.originalSystemPrompt}
Pass control back to the ${HUMAN_USER_NAME} to collect requirements until you are happy with the specification, then come up with a plan.
Your team has the following members:
${HUMAN_USER_NAME}
${this.name}
${team.members.map((member) => member.name).join("\n")}
You are the ${this.name}.
When all tasks have been completed, pass control back to the ${HUMAN_USER_NAME}.`;

    this.team = team;
  }
}
