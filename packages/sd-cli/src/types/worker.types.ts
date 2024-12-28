import { ISdBuildRunnerWorkerRequest } from "./build-runner.types";
import { ISdBuildMessage, ISdBuildRunnerResult } from "./build.types";

export interface TServerWorkerType {
  methods: {
    listen: { params: [{ path: string } | { port: number }]; returnType: number };
    setPathProxy: { params: [Record<string, string | number>]; returnType: void };
    broadcastReload: { params: [Set<string>]; returnType: void };
  };
  events: {};
}

// export interface TSdLintWorkerType {
//   methods: {
//     lint: { params: [{ cwd: string; fileSet: Set<string> }]; returnType: ESLint.LintResult[] };
//   };
//   events: {};
// }

// export interface TSdTsCompileWorkerType {
//   methods: {
//     initialize: { params: [SdTsCompilerOptions]; returnType: void };
//     compile: { params: [Set<TNormPath>]; returnType: ISdTsCompilerResult };
//   };
//   events: {};
// }

export interface TSdBuildRunnerWorkerType {
  methods: {
    run: { params: [ISdBuildRunnerWorkerRequest]; returnType: ISdBuildMessage[] | void };
  };
  events: {
    change: void;
    complete: ISdBuildRunnerResult;
  };
}
