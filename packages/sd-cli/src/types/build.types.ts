import { TNormPath } from "@simplysm/sd-core-node";

export interface ISdBuildRunnerResult {
  affectedFilePathSet: Set<TNormPath>;
  buildMessages: ISdBuildMessage[];
  emitFileSet: Set<TNormPath>;
}

export interface ISdBuildMessage {
  filePath: TNormPath | undefined;
  line: number | undefined;
  char: number | undefined;
  code: string | undefined;
  severity: "error" | "warning" | "suggestion" | "message";
  message: string;
  type: string | undefined;
}
