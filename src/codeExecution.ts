import { exec as originalExec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import {
  COMMAND_PATTERNS,
  LANGUAGE_TO_FILE_EXTENSION,
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
} from "./constants";
import { Code, CodeExecutionConfig, ExecutionResult, Language } from "./types";

const exec = promisify(originalExec);

// Does not extract single line code blocks as the language would tend to typically not be specified
export function extractCode(text: string): [Language, Code][] {
  const codePattern = /```(\w+)?\s*([\s\S]*?)```/g;
  const match = [...text.matchAll(codePattern)];
  return match.map((m) => [m[1] || "", m[2]]);
}

async function executeCode(
  language: string,
  code: string,
  workingDirectory: string
): Promise<ExecutionResult> {
  // Make sure working directory exists
  fs.mkdirSync(workingDirectory, { recursive: true });

  const fileExt = getFileExtension(language);
  // TODO: provide unique file names here
  const fileName = fileExt ? `code.${fileExt}` : "code";
  const filePath = path.join(workingDirectory, fileName);
  fs.writeFileSync(filePath, code);

  let result: ExecutionResult;
  const command = getCommand(language, workingDirectory, filePath);

  try {
    const cmdResult = await exec(command);
    result = {
      success: true,
      logs: `${language}: Execution successful.
${cmdResult.stdout}`,
    };
  } catch (e) {
    const error = e as any;
    result = {
      success: false,
      logs: `${language}: Execution failed:
${error.stderr}`,
    };
  }

  fs.unlinkSync(filePath);
  return result;
}

function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return SUPPORTED_LANGUAGES.has(lang as SupportedLanguage);
}

function getFileExtension(language: string): string {
  const lowerCaseLanguage = language.toLowerCase();

  if (isSupportedLanguage(lowerCaseLanguage)) {
    return LANGUAGE_TO_FILE_EXTENSION[lowerCaseLanguage];
  } else {
    throw new Error(`Unsupported language: ${language}`);
  }
}

function getCommand(
  language: string,
  workingDirectory: string,
  filePath: string
): string {
  const lowerCaseLanguage = language.toLowerCase();
  if (!isSupportedLanguage(lowerCaseLanguage)) {
    throw new Error(`Unsupported language: ${language}`);
  }
  const commandPattern = COMMAND_PATTERNS[lowerCaseLanguage];
  // The check above ensures that commandPattern will not be undefined
  return commandPattern
    .replace("{DIR}", workingDirectory)
    .replace("{FILE}", filePath);
}

export async function executeCodeBlocks(
  codeBlocks: [Language, Code][],
  codeExecutionConfig: CodeExecutionConfig
): Promise<string> {
  const supportedCodeBlocks = codeBlocks.filter(([language]) =>
    isSupportedLanguage(language.toLowerCase())
  );

  const results: string[] = [];

  // Execute each supported code block sequentially to allow prerequisites to be installed if needed
  for (const [language, code] of supportedCodeBlocks) {
    const result = await executeCode(
      language,
      code,
      codeExecutionConfig.workingDirectory
    );

    results.push(result.logs);

    // break out of execution if there's a failure
    if (!result.success) {
      break;
    }
  }

  // Join the results into a single string
  return results.join("\n");
}
