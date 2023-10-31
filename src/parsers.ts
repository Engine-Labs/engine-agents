export function stringifyWithFns(obj: any): string {
  return JSON.stringify(obj, (_key, value) => {
    if (typeof value === "function") {
      return value.toString();
    }
    return value;
  });
}

export function parseWithFns(json: string) {
  return JSON.parse(json, (_key, value) => {
    if (typeof value === "string" && value.startsWith("async function")) {
      return eval(`(${value})`);
    }
    return value;
  });
}
