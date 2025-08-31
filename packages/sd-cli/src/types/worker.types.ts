import { ISdBuildRunnerWorkerRequest } from "./build-runner.types";
import { ISdBuildMessage, ISdBuildRunnerResult } from "./build.types";
import { ESLint } from "eslint";
import { TNormPath } from "@simplysm/sd-core-node";
import { ComponentStylesheetResult } from "@angular/build/src/tools/esbuild/angular/component-stylesheets";

export interface TServerWorkerType {
  methods: {
    listen: { params: [{ path: string } | { port: number }]; returnType: number };
    setPathProxy: { params: [Record<string, string | number>]; returnType: void };
    broadcastReload: { params: [string | undefined, Set<string>]; returnType: void };
  };
  events: {};
}

export interface TSdLintWorkerType {
  methods: {
    lint: { params: [{ cwd: string; fileSet: Set<string> }]; returnType: ESLint.LintResult[] };
  };
  events: {};
}

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

export interface TStyleBundlerWorkerType {
  methods: {
    prepare: { params: [string, boolean]; returnType: void };
    bundle: {
      params: [string, TNormPath, TNormPath | null];
      returnType: ComponentStylesheetResult;
    };
    invalidate: { params: [Set<TNormPath>]; returnType: void };
  };
  events: {};
}
