import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources";
import type {
  FunctionCall,
  FunctionCallOption,
  FunctionConfig,
  Message,
} from "./types";
import { EXECUTOR, HUMAN_USER_NAME } from "./constants";

const openai = new OpenAI();

function getRole(
  senderName: string,
  requester: string
): OpenAI.ChatCompletionRole {
  if (senderName === HUMAN_USER_NAME || senderName === EXECUTOR) {
    return "user";
  }
  return "assistant";
}

function mapMessages(
  requester: string,
  messages: Message[]
): ChatCompletionMessageParam[] {
  // Messages previously sent by the requesting member are considered 'assistant' messages
  return messages.map((message) => ({
    role: getRole(message.sender, requester),
    content: message.content,
  }));
}

export async function getCompletion(
  requester: string,
  systemPrompt: string,
  messages: Message[],
  functionConfig: FunctionConfig,
  functionCall: FunctionCallOption
): Promise<FunctionCall | string | null> {
  const formattedMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...mapMessages(requester, messages),
  ];

  let functionSchemas = undefined;
  if (functionCall !== "none") {
    functionSchemas = Object.values(functionConfig).map(
      (config) => config.schema
    );
  }

  try {
    const { choices } = await openai.chat.completions.create({
      messages: formattedMessages,
      model: "gpt-4-0613",
      functions: functionSchemas,
      function_call: functionSchemas === undefined ? undefined : functionCall,
    });

    const { message } = choices[0];
    const { function_call, content } = message;

    if (function_call) {
      const functionArgs = JSON.parse(formatJsonStr(function_call.arguments));
      return {
        name: function_call.name,
        arguments: functionArgs,
        content: content || "",
      };
    }

    const extractedFunctionCall = tryToExtractFunctionCall(content);

    if (extractedFunctionCall) {
      return {
        name: extractedFunctionCall.name,
        arguments: JSON.parse(formatJsonStr(extractedFunctionCall.arguments)),
        content: extractedFunctionCall.content,
      };
    }

    return content;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

function formatJsonStr(jstr: string): string {
  /* Remove newlines outside of quotes, and handle JSON escape sequences.

  1. this function removes the newline in the query outside of quotes otherwise JSON.parse(s) will fail.
      Ex 1:
      "{\n"tool": "python",\n"query": "print('hello')\nprint('world')"\n}" -> "{"tool": "python","query": "print('hello')\nprint('world')"}"
      Ex 2:
      "{\n  \"location\": \"Boston, MA\"\n}" -> "{"location": "Boston, MA"}"

  2. this function also handles JSON escape sequences inside quotes,
      Ex 1:
      '{"args": "a\na\na\ta"}' -> '{"args": "a\\na\\na\\ta"}'
  */

  let result: string[] = [];
  let insideQuotes = false;
  let lastChar = " ";
  for (let char of jstr) {
    if (lastChar !== "\\" && char === '"') {
      insideQuotes = !insideQuotes;
    }
    lastChar = char;
    if (!insideQuotes && char === "\n") {
      continue;
    }
    if (insideQuotes && char === "\n") {
      char = "\\n";
    }
    if (insideQuotes && char === "\t") {
      char = "\\t";
    }
    result.push(char);
  }
  return result.join("");
}

export function tryToExtractFunctionCall(
  input: string | null
): FunctionCall | null {
  if (!input) {
    return null;
  }

  // In order, the regexes match the following examples of function calling:
  //   [functions.give_chat_control]({"teamMember": "CTO"})
  //   [functions.give_chat_control]{"teamMember": "CTO"}
  // Empty arguments are allowed and should also be matched successfully.

  const regexes = [
    /(?:\r?\n|^)\[(?<fn>.*)\]\((?<args>.*)\)\s*$/,
    /(?:\r?\n|^)\[(?<fn>.*)\]\s*(?<args>\{.*\})\s*$/,
  ];

  for (const regex of regexes) {
    const match = regex.exec(input);
    if (match) {
      const { groups } = match;
      const functionName = groups?.fn as string;
      const args = (groups?.args as string) || "{}";
      const content = input.slice(0, match.index).trim();
      return {
        name: functionName.split(".").pop() as string,
        arguments: args,
        content: content,
      };
    }
  }

  return null;
}
