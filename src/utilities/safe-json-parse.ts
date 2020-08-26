export function safeJsonParse(str: string) {
  let result = str;
  try {
    result = JSON.parse(str);
  }
  catch(e) {
    // ignore errors
  }
  return result;
}

export function safeJsonParseIfString(value: any) {
  return typeof value === "string"
          ? safeJsonParse(value)
          : value;
}
