import { ISdTsCompilerPrepareResult, ISdTsCompilerResult, SdTsCompilerOptions } from "../../ts-builder/SdTsCompiler";

export interface TSdTsCompileWorkerType {
  methods: {
    initialize: { params: [SdTsCompilerOptions]; returnType: void };
    invalidate: { params: [Set<string>]; returnType: void };
    prepare: { params: []; returnType: ISdTsCompilerPrepareResult };
    build: { params: [Set<string>]; returnType: ISdTsCompilerResult };
  };
  events: {};
}
