import OpenAI from "openai";

export interface Message {
  sender: string;
  content: string;
}

export interface FunctionConfig {
  // names must match between schemas and functions
  schemas: OpenAI.Chat.Completions.ChatCompletionCreateParams.Function[];
  functions: {
    [name: string]: CallableFunction;
  };
}

export interface MemberState {
  name: string;
  systemPrompt: string;
  messages: Message[];
  functionConfig: string;
  codeExecutionConfig: CodeExecutionConfig;
}

export interface TeamState {
  teamLeader: MemberState;
  members: MemberState[];
}

export interface FunctionCall {
  name: string;
  arguments: any;
  content: string;
}

export interface MemberResponse {
  nextTeamMember: string | null;
  responder: string;
  response: string;
}

export function isFunctionCall(object: any): object is FunctionCall {
  return "name" in object && "arguments" in object && "content" in object;
}

export type ChatResponse = {
  id: string;
  messages: Message[];
};
export type Language = string;
export type Code = string;

export interface CodeExecutionConfig {
  enabled: boolean;
  workingDirectory: string;
}
