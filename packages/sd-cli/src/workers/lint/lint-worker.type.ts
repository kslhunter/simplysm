import { ESLint } from "eslint";

export interface TSdLintWorkerType {
  methods: {
    lint: { params: [{ cwd: string; fileSet: Set<string> }]; returnType: ESLint.LintResult[] };
  };
  events: {};
}
