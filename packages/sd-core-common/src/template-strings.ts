export function html(strings: TemplateStringsArray, ...values: any[]) {
  return _combine(strings, ...values);
}

export function javascript(strings: TemplateStringsArray, ...values: any[]) {
  return _combine(strings, ...values);
}

export function typescript(strings: TemplateStringsArray, ...values: any[]) {
  return _combine(strings, ...values);
}

export function string(strings: TemplateStringsArray, ...values: any[]) {
  return _combine(strings, ...values);
}

export function tsql(strings: TemplateStringsArray, ...values: any[]) {
  return _combine(strings, ...values);
}

export function mysql(strings: TemplateStringsArray, ...values: any[]) {
  return _combine(strings, ...values);
}

export function pgsql(strings: TemplateStringsArray, ...values: any[]) {
  return _combine(strings, ...values);
}

function _combine(strings: TemplateStringsArray, ...values: any[]) {
  return _trim(strings.reduce((result, str, i) => {
    // strings[i]는 이미 이스케이프가 처리된 문자열입니다. (예: \` -> `)
    const value = values[i] !== undefined ? String(values[i]) : "";
    return result + str + value;
  }, ""));
}

function _trim(full: string) {
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
