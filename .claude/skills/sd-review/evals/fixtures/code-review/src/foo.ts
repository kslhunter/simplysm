export function loadConfig(path: string) {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    // 무처리
  }
}
