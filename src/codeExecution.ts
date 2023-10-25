import fs from "fs";
import path from "path";
import { promisify } from "util";
import { exec as originalExec } from "child_process";
import { Language, Code, CodeExecutionConfig } from "./types/chat";

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
): Promise<string> {
  // Make sure working directory exists
  fs.mkdirSync(workingDirectory, { recursive: true });

  const fileExt = getFileType(language);
  const fileName = fileExt ? `code.${fileExt}` : "code";
  const filePath = path.join(workingDirectory, fileName);
  fs.writeFileSync(filePath, code);

  let logs;
  const command = getCommand(language, workingDirectory, filePath);

  try {
    const cmdResult = await exec(command);
    logs = `Execution successful.
${cmdResult.stdout}`;
  } catch (e) {
    const error = e as any;
    logs = `Execution failed:
${error.stderr}`;
  }

  fs.unlinkSync(filePath);
  return logs;
}

function getFileType(language: string): string {
  switch (language.toLowerCase()) {
    case "python":
      return "py";
    case "bash":
    case "sh":
      return "";
    default:
      throw new Error(`Unsupported language: ${language}`);
  }
}

function getCommand(
  language: string,
  workingDirectory: string,
  filePath: string
): string {
  switch (language.toLowerCase()) {
    case "python":
      return `cd ${workingDirectory} && python3 ${filePath}`;
    case "bash":
    case "sh":
      return `cd ${workingDirectory} && ${language.toLowerCase()} ${filePath}`;
    default:
      throw new Error(`Unsupported language: ${language}`);
  }
}

export async function executeCodeBlocks(
  codeBlocks: [Language, Code][],
  codeExecutionConfig: CodeExecutionConfig
): Promise<string> {
  const results: string[] = [];

  for (const [language, code] of codeBlocks) {
    if (["python", "bash"].includes(language.toLowerCase())) {
      const logs = await executeCode(
        language,
        code,
        codeExecutionConfig.workingDirectory
      );
      results.push(logs);
    }
  }

  return results.join("\n");
}
