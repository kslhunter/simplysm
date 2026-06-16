/**
 * BIFF12 수식 Ptg 토큰 (부분집합) 인코더/디코더.
 *
 * 지원: 정수/실수 상수, 문자열 상수("..."), 단일 셀 참조(A1/$A$1), 이항 연산(+ - * / ^ & = < > <= >= <>),
 * 단항 마이너스, 괄호. 함수 호출·범위(A1:B2)·시트 참조 등은 미지원 → throw.
 *
 * Ptg ID 는 [MS-XLS] 2.5.198 / [MS-XLSB] 2.5.97 기준. 셀참조 loc 는 BIFF12 RgceLoc
 * (row u32 + col u16{col14b, fColRel, fRowRel}). 문자열/프레이밍은 인코더↔디코더 자기일관.
 */

const PTG = {
  Add: 0x03,
  Sub: 0x04,
  Mul: 0x05,
  Div: 0x06,
  Power: 0x07,
  Concat: 0x08,
  Lt: 0x09,
  Le: 0x0a,
  Eq: 0x0b,
  Ge: 0x0c,
  Gt: 0x0d,
  Ne: 0x0e,
  UMinus: 0x13,
  Str: 0x17,
  Int: 0x1e,
  Num: 0x1f,
  Ref: 0x24,
} as const;

const BIN_OP: Record<string, { ptg: number; prec: number }> = {
  "=": { ptg: PTG.Eq, prec: 1 },
  "<>": { ptg: PTG.Ne, prec: 1 },
  "<=": { ptg: PTG.Le, prec: 1 },
  ">=": { ptg: PTG.Ge, prec: 1 },
  "<": { ptg: PTG.Lt, prec: 1 },
  ">": { ptg: PTG.Gt, prec: 1 },
  "&": { ptg: PTG.Concat, prec: 2 },
  "+": { ptg: PTG.Add, prec: 3 },
  "-": { ptg: PTG.Sub, prec: 4 - 1 },
  "*": { ptg: PTG.Mul, prec: 4 },
  "/": { ptg: PTG.Div, prec: 4 },
  "^": { ptg: PTG.Power, prec: 5 },
};
const PTG_TO_OP = new Map<number, string>(
  Object.entries(BIN_OP).map(([op, v]) => [v.ptg, op]),
);
const PTG_TO_PREC = new Map<number, number>(
  Object.entries(BIN_OP).map(([, v]) => [v.ptg, v.prec]),
);

type Tok =
  | { k: "num"; v: number }
  | { k: "str"; v: string }
  | { k: "ref"; v: string }
  | { k: "op"; v: string }
  | { k: "("; v: "(" }
  | { k: ")"; v: ")" };

function tokenize(formula: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  const s = formula;
  while (i < s.length) {
    const ch = s[i];
    if (ch === " ") {
      i++;
      continue;
    }
    if (ch === "(") {
      out.push({ k: "(", v: "(" });
      i++;
      continue;
    }
    if (ch === ")") {
      out.push({ k: ")", v: ")" });
      i++;
      continue;
    }
    if (ch === '"') {
      let j = i + 1;
      let val = "";
      while (j < s.length) {
        if (s[j] === '"') {
          if (s[j + 1] === '"') {
            val += '"';
            j += 2;
            continue;
          }
          break;
        }
        val += s[j];
        j++;
      }
      out.push({ k: "str", v: val });
      i = j + 1;
      continue;
    }
    const two = s.slice(i, i + 2);
    if (two === "<=" || two === ">=" || two === "<>") {
      out.push({ k: "op", v: two });
      i += 2;
      continue;
    }
    if ("+-*/^&=<>".includes(ch)) {
      out.push({ k: "op", v: ch });
      i++;
      continue;
    }
    const ref = /^\$?[A-Za-z]{1,3}\$?[0-9]+/.exec(s.slice(i));
    if (ref != null && !/[A-Za-z0-9_.]/.test(s[i + ref[0].length] ?? "")) {
      out.push({ k: "ref", v: ref[0].toUpperCase() });
      i += ref[0].length;
      continue;
    }
    const num = /^[0-9]+\.?[0-9]*([eE][+-]?[0-9]+)?/.exec(s.slice(i));
    if (num != null) {
      out.push({ k: "num", v: parseFloat(num[0]) });
      i += num[0].length;
      continue;
    }
    throw new Error(`xlsb 수식: 지원하지 않는 토큰 "${s.slice(i)}" (함수/범위 참조 미지원)`);
  }
  return out;
}

interface RefLoc {
  row: number;
  col: number;
  colRel: boolean;
  rowRel: boolean;
}

function parseRef(ref: string): RefLoc {
  const m = /^(\$?)([A-Z]{1,3})(\$?)([0-9]+)$/.exec(ref);
  if (m == null) throw new Error(`xlsb 수식: 잘못된 셀 참조 "${ref}"`);
  const colRel = m[1] !== "$";
  let col = 0;
  for (const c of m[2]) col = col * 26 + (c.charCodeAt(0) - 64);
  col -= 1;
  const rowRel = m[3] !== "$";
  const row = parseInt(m[4], 10) - 1;
  return { row, col, colRel, rowRel };
}

function colName(col: number): string {
  let n = col + 1;
  let out = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    out = String.fromCharCode(65 + r) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/** A1 수식 문자열 → rgce(Ptg 토큰 바이트). 앞의 "=" 는 있어도 무시. */
export function encodeFormula(formula: string): Uint8Array {
  const f = formula.startsWith("=") ? formula.slice(1) : formula;
  const toks = tokenize(f);

  // Shunting-yard → RPN(Ptg 출력)
  const out: number[] = [];
  const ops: { ptg: number; prec: number; unary?: boolean }[] = [];
  const emit = (bytes: number[]): void => {
    for (const b of bytes) out.push(b);
  };
  const u16 = (v: number): number[] => [v & 0xff, (v >>> 8) & 0xff];
  const u32 = (v: number): number[] => [
    v & 0xff,
    (v >>> 8) & 0xff,
    (v >>> 16) & 0xff,
    (v >>> 24) & 0xff,
  ];

  let prevVal = false; // 직전 토큰이 피연산자면 true (단항/이항 구분)
  for (const t of toks) {
    if (t.k === "num") {
      if (Number.isInteger(t.v) && t.v >= 0 && t.v <= 0xffff) {
        emit([PTG.Int, ...u16(t.v)]);
      } else {
        const buf = new Uint8Array(8);
        new DataView(buf.buffer).setFloat64(0, t.v, true);
        emit([PTG.Num, ...buf]);
      }
      prevVal = true;
    } else if (t.k === "str") {
      const chars: number[] = [];
      for (const c of t.v) chars.push(...u16(c.charCodeAt(0)));
      emit([PTG.Str, ...u16(t.v.length), ...chars]);
      prevVal = true;
    } else if (t.k === "ref") {
      const loc = parseRef(t.v);
      const colField = (loc.col & 0x3fff) | (loc.colRel ? 0x4000 : 0) | (loc.rowRel ? 0x8000 : 0);
      emit([PTG.Ref, ...u32(loc.row), ...u16(colField)]);
      prevVal = true;
    } else if (t.k === "(") {
      ops.push({ ptg: -1, prec: 0 });
      prevVal = false;
    } else if (t.k === ")") {
      while (ops.length > 0 && ops[ops.length - 1].ptg !== -1) popOp(ops, emit);
      if (ops.length === 0) throw new Error("xlsb 수식: 괄호 불일치");
      ops.pop();
      prevVal = true;
    } else {
      // op
      if (!prevVal && t.v === "-") {
        ops.push({ ptg: PTG.UMinus, prec: 6, unary: true });
      } else {
        if (!(t.v in BIN_OP)) {
          throw new Error(`xlsb 수식: 지원하지 않는 연산자 "${t.v}"`);
        }
        const info = BIN_OP[t.v];
        while (
          ops.length > 0 &&
          ops[ops.length - 1].ptg !== -1 &&
          ops[ops.length - 1].prec >= info.prec
        ) {
          popOp(ops, emit);
        }
        ops.push({ ptg: info.ptg, prec: info.prec });
      }
      prevVal = false;
    }
  }
  while (ops.length > 0) {
    if (ops[ops.length - 1].ptg === -1) throw new Error("xlsb 수식: 괄호 불일치");
    popOp(ops, emit);
  }
  return Uint8Array.from(out);
}

function popOp(
  ops: { ptg: number; prec: number; unary?: boolean }[],
  emit: (b: number[]) => void,
): void {
  const op = ops.pop()!;
  emit([op.ptg]);
}

/** rgce(Ptg 토큰 바이트) → A1 수식 문자열 (정규화된 infix). */
export function decodeFormula(rgce: Uint8Array): string {
  const stack: { str: string; prec: number }[] = [];
  let i = 0;
  const dv = new DataView(rgce.buffer, rgce.byteOffset, rgce.byteLength);
  while (i < rgce.length) {
    const ptg = rgce[i++];
    if (ptg === PTG.Int) {
      stack.push({ str: String(rgce[i] | (rgce[i + 1] << 8)), prec: 99 });
      i += 2;
    } else if (ptg === PTG.Num) {
      stack.push({ str: String(dv.getFloat64(i, true)), prec: 99 });
      i += 8;
    } else if (ptg === PTG.Str) {
      const cch = rgce[i] | (rgce[i + 1] << 8);
      i += 2;
      let str = "";
      for (let k = 0; k < cch; k++) {
        str += String.fromCharCode(rgce[i] | (rgce[i + 1] << 8));
        i += 2;
      }
      stack.push({ str: `"${str.replace(/"/g, '""')}"`, prec: 99 });
    } else if (ptg === PTG.Ref) {
      const row = rgce[i] | (rgce[i + 1] << 8) | (rgce[i + 2] << 16) | (rgce[i + 3] << 24);
      const colField = rgce[i + 4] | (rgce[i + 5] << 8);
      i += 6;
      const col = colField & 0x3fff;
      const colRel = (colField & 0x4000) !== 0;
      const rowRel = (colField & 0x8000) !== 0;
      const a1 = `${colRel ? "" : "$"}${colName(col)}${rowRel ? "" : "$"}${row + 1}`;
      stack.push({ str: a1, prec: 99 });
    } else if (ptg === PTG.UMinus) {
      const a = stack.pop()!;
      stack.push({ str: `-${a.prec < 6 ? `(${a.str})` : a.str}`, prec: 6 });
    } else if (PTG_TO_OP.has(ptg)) {
      const prec = PTG_TO_PREC.get(ptg)!;
      const op = PTG_TO_OP.get(ptg)!;
      const b = stack.pop()!;
      const a = stack.pop()!;
      const left = a.prec < prec ? `(${a.str})` : a.str;
      const right = b.prec <= prec ? `(${b.str})` : b.str;
      stack.push({ str: `${left}${op}${right}`, prec });
    } else {
      throw new Error(`xlsb 수식: 디코드 미지원 Ptg 0x${ptg.toString(16)}`);
    }
  }
  if (stack.length !== 1) throw new Error("xlsb 수식: 디코드 스택 불일치");
  return stack[0].str;
}
