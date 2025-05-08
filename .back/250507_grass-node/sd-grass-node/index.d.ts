export interface CompileOptions {
  style?: "expanded" | "compressed";
}

/**
 * Compile SCSS to CSS using native Rust-powered grass engine.
 * @param source SCSS source code as string
 * @param options Optional compile options
 * @returns Compiled CSS string
 */
export declare function compileScss(
  source: string,
  options?: CompileOptions,
): string;