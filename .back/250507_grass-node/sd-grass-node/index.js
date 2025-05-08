import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Rust native addon (.node)
const binding = require('./index.node');

/**
 * @typedef {Object} CompileOptions
 * @property {'expanded' | 'compressed'} [style]
 */

/**
 * SCSS → CSS 컴파일
 * @param {string} source - SCSS 원본
 * @param {CompileOptions} [options]
 * @returns {string}
 */
export function compileScss(source, options) {
  return binding.compileScssWithOpts(source, options);
}