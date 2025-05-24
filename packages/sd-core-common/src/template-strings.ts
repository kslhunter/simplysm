export function html(strings: TemplateStringsArray, ...values: any[]) {
  return _trimmed(String.raw(strings, ...values));
}

export function javascript(strings: TemplateStringsArray, ...values: any[]) {
  return _trimmed(String.raw(strings, ...values));
}

function _trimmed(full: string) {
  // 줄 분해
  const lines = full.split("\n");

  // 첫 줄 공백-only 라인 제거
  if (lines.length && lines[0].trim() === "") {
    lines.shift();
  }

  // 마지막 줄 공백-only 라인 제거
  if (lines.length && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }

  // 최소 들여쓰기 계산
  const minIndent = lines
    .filter((line) => line.trim() !== "")
    .reduce((min, line) => {
      if (line.trim() === "") return min;
      const indent = line.match(/^ */)?.[0].length ?? 0;
      return Math.min(min, indent);
    }, Infinity);

  // 들여쓰기 제거
  const result = lines.map((line) => {
    if (line.trim() === "") return "";
    return line.slice(minIndent);
  });

  return result.join("\n");
}
