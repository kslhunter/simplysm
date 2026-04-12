import esbuild from "esbuild";
import {
  createServerEsbuildOptions,
  writeChangedOutputFiles,
} from "../esbuild/esbuild-config";

/**
 * esbuild watch context 생성 옵션
 */
export interface EsbuildContextOptions {
  pkgDir: string;
  entryPoints: string[];
  env?: Record<string, string>;
  external: string[];
}

/** esbuild watch context (모듈 스코프 상태) */
let context: esbuild.BuildContext | undefined;

/** 마지막 빌드의 metafile (변경 필터링용) */
let lastMetafile: esbuild.Metafile | undefined;

/**
 * esbuild watch context를 생성한다.
 * dev 모드 전용 (metafile:true, write:false).
 */
export async function createContext(options: EsbuildContextOptions): Promise<void> {
  const baseOptions = createServerEsbuildOptions({
    pkgDir: options.pkgDir,
    entryPoints: options.entryPoints,
    env: options.env,
    external: options.external,
    dev: true,
  });

  context = await esbuild.context({
    ...baseOptions,
    metafile: true,
    write: false,
  });
}

/**
 * esbuild rebuild를 실행하고 metafile을 갱신한다.
 * context가 없으면 null을 반환한다 (tsc-only 경로).
 */
export async function rebuild(): Promise<{
  success: boolean;
  errors?: string[];
  warnings?: string[];
} | null> {
  if (context == null) return null;

  const result = await context.rebuild();

  if (result.metafile != null) {
    lastMetafile = result.metafile;
  }

  if (result.outputFiles) {
    await writeChangedOutputFiles(result.outputFiles);
  }

  const errors = result.errors.map((e) => e.text);
  const warnings = result.warnings.map((w) => w.text);

  return {
    success: result.errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * esbuild context를 재생성한다 (LOGIC-001).
 *
 * 선제 초기화 + try/finally 패턴으로 리소스 해제를 보장한다:
 * 1. old context를 로컬 변수에 보관
 * 2. 모듈 참조를 undefined로 선제 초기화 — 생성 실패 시 disposed 참조 방지
 * 3. 새 context 생성 시도
 * 4. finally에서 old context dispose — 생성 성공/실패와 무관하게 실행
 */
export async function recreateContext(options: EsbuildContextOptions): Promise<void> {
  const oldContext = context;
  context = undefined;
  lastMetafile = undefined;

  try {
    await createContext(options);
  } finally {
    if (oldContext != null) {
      await oldContext.dispose();
    }
  }
}

/**
 * esbuild context를 정리하고 상태를 초기화한다.
 */
export async function dispose(): Promise<void> {
  const contextToDispose = context;
  context = undefined;
  lastMetafile = undefined;

  if (contextToDispose != null) {
    await contextToDispose.dispose();
  }
}

/**
 * 마지막 빌드의 metafile을 반환한다 (변경 필터링에 사용).
 */
export function getMetafile(): esbuild.Metafile | undefined {
  return lastMetafile;
}

/**
 * esbuild context 존재 여부를 반환한다.
 */
export function hasContext(): boolean {
  return context != null;
}
