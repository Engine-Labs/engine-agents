import { executeCodeBlocks, extractCode } from "./codeExecution";
import {
  EXECUTOR,
  GIVE_BACK_CONTROL,
  GIVE_CONTROL,
  HUMAN_USER_NAME,
  FINISH_CHAT,
  TEAM_LEADER,
} from "./constants";
import { formatJsonStr, getCompletion } from "./llm";
import { stringifyWithFns } from "./parsers";
import { Team } from "./team";
import {
  CodeExecutionConfig,
  FunctionCall,
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
    this.systemPrompt = `You take in turns to act as members of a team with the following members:
${team.leader.name} (team leader)
${team.members.map((member) => member.name).join("\n")}
Currently, you are acting as ${this.name}.
You announce who you are in your responses.
${this.originalSystemPrompt}`;
  }

  getFunctionConfig(canPassControl: boolean = true): FunctionConfig {
    if (!canPassControl) {
      // filter out the control passing functions
      return Object.fromEntries(
        Object.entries(this.functionConfig).filter(
          ([name, _]) =>
            name !== GIVE_BACK_CONTROL &&
            name !== GIVE_CONTROL &&
            name !== FINISH_CHAT
        )
      );
    } else {
      return this.functionConfig;
    }
  }

  async getResponse(canPassControl: boolean = true): Promise<MemberResponse> {
    const functionConfig = this.getFunctionConfig(canPassControl);

    let completion = await getCompletion(
      this.systemPrompt,
      this.messages,
      functionConfig
    );

    const retryCompletion = async (name: string) => {
      return await getCompletion(
        this.systemPrompt,
        this.messages,
        functionConfig,
        { name }
      );
    };

    // Handle the case in which a function call appears in body of completion
    if (typeof completion === "string" && canPassControl) {
      const controlFunctions = [GIVE_BACK_CONTROL, GIVE_CONTROL, FINISH_CHAT];
      for (const controlFunction of controlFunctions) {
        if (completion.includes(controlFunction)) {
          completion = await retryCompletion(controlFunction);
          break;
        }
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
    // Don't bother parsing arguments for control function which don't have any
    const parseArguments = (name: string, args: string): any => {
      if (name === GIVE_BACK_CONTROL || name === FINISH_CHAT) {
        return null;
      }
      return JSON.parse(formatJsonStr(args));
    };

    const parsedArgs = parseArguments(name, args);

    switch (name) {
      case GIVE_BACK_CONTROL:
        return {
          nextTeamMember: TEAM_LEADER,
          responder: this.name,
          response: content,
        };

      case GIVE_CONTROL:
        return {
          nextTeamMember: parsedArgs.teamMember,
          responder: this.name,
          response: content,
        };

      case FINISH_CHAT:
        return {
          nextTeamMember: HUMAN_USER_NAME,
          responder: this.name,
          response: content,
        };

      default:
        if (!(name in this.functionConfig)) {
          return {
            nextTeamMember: null,
            responder: this.name,
            response: `No such function: ${name}`,
          };
        }

        const functionResult = await this.functionConfig[name].function(
          parsedArgs
        );

        const formattedFunctionResult = `${content}
function call: ${name}
arguments: ${JSON.stringify(parsedArgs, null, 2)}
result: ${functionResult}`.trim();

        return {
          nextTeamMember: null,
          responder: EXECUTOR,
          response: formattedFunctionResult,
        };
    }
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
    this.systemPrompt = `You take in turns to act as members of a team with the following members:
${team.leader.name} (team leader)
${team.members.map((member) => member.name).join("\n")}
Currently, you are acting as the team leader, ${this.name}.
You announce who you are in your responses.
Delegate to other team members as required.
Finish the chat when the team are done.
${this.originalSystemPrompt}`;
  }
}
