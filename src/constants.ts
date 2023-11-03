export const HUMAN_USER_NAME = "Human Admin User";
export const EXECUTOR = "Executor";
export const TEAM_LEADER = "System Team Leader";

export const GIVE_CONTROL = "give_chat_control";
export const GIVE_BACK_CONTROL = "give_chat_control_to_leader";
export const PASS_TO_USER = "pass_chat_control_to_user";

export const MAX_ITERATIONS = 30; // limit for agent messages loop

export type SupportedLanguage = "python" | "python3" | "bash" | "sh" | "shell";

export const SUPPORTED_LANGUAGES: Set<SupportedLanguage> = new Set([
  "python",
  "python3",
  "bash",
  "sh",
  "shell",
]);

export const LANGUAGE_TO_FILE_EXTENSION: { [K in SupportedLanguage]: string } =
  {
    python: "py",
    python3: "py",
    bash: "sh",
    sh: "sh",
    shell: "sh",
  };

export const COMMAND_PATTERNS: { [K in SupportedLanguage]: string } = {
  python: "cd {DIR} && python {FILE}",
  python3: "cd {DIR} && python3 {FILE}",
  bash: "cd {DIR} && bash {FILE}",
  sh: "cd {DIR} && sh {FILE}",
  shell: "cd {DIR} && sh {FILE}",
};
