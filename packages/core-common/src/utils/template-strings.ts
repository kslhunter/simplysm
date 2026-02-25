/**
 * Template string tag functions
 * For IDE code highlighting support (actual behavior is string concatenation + indent normalization)
 */

/**
 * Template tag for JavaScript code highlighting
 * @param strings Template string array
 * @param values Interpolated values
 * @returns String with normalized indentation
 * @example
 * const code = js`
 *   function hello() {
 *     return "world";
 *   }
 * `;
 */
export function js(strings: TemplateStringsArray, ...values: unknown[]): string {
  return _combine(strings, values);
}

/**
 * Template tag for TypeScript code highlighting
 * @param strings Template string array
 * @param values Interpolated values
 * @returns String with normalized indentation
 * @example
 * const code = ts`
 *   interface User {
 *     name: string;
 *     age: number;
 *   }
 * `;
 */
export function ts(strings: TemplateStringsArray, ...values: unknown[]): string {
  return _combine(strings, values);
}

/**
 * Template tag for HTML markup highlighting
 * @param strings Template string array
 * @param values Interpolated values
 * @returns String with normalized indentation
 * @example
 * const markup = html`
 *   <div class="container">
 *     <span>${name}</span>
 *   </div>
 * `;
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  return _combine(strings, values);
}

/**
 * Template tag for MSSQL T-SQL highlighting
 * @param strings Template string array
 * @param values Interpolated values
 * @returns String with normalized indentation
 * @example
 * const query = tsql`
 *   SELECT TOP 10 *
 *   FROM Users
 *   WHERE Name LIKE '%${keyword}%'
 * `;
 */
export function tsql(strings: TemplateStringsArray, ...values: unknown[]): string {
  return _combine(strings, values);
}

/**
 * Template tag for MySQL SQL highlighting
 * @param strings Template string array
 * @param values Interpolated values
 * @returns String with normalized indentation
 * @example
 * const query = mysql`
 *   SELECT *
 *   FROM users
 *   LIMIT 10
 * `;
 */
export function mysql(strings: TemplateStringsArray, ...values: unknown[]): string {
  return _combine(strings, values);
}

/**
 * Template tag for PostgreSQL SQL highlighting
 * @param strings Template string array
 * @param values Interpolated values
 * @returns String with normalized indentation
 * @example
 * const query = pgsql`
 *   SELECT *
 *   FROM users
 *   OFFSET 0 LIMIT 10
 * `;
 */
export function pgsql(strings: TemplateStringsArray, ...values: unknown[]): string {
  return _combine(strings, values);
}

function _combine(strings: TemplateStringsArray, values: unknown[]): string {
  const raw = strings.reduce((result, str, i) => {
    const value = values[i] !== undefined ? String(values[i]) : "";
    return result + str + value;
  }, "");
  return _trimIndent(raw);
}

function _trimIndent(text: string): string {
  const lines = text.split("\n");

  // Remove leading and trailing empty lines (remove all consecutive empty lines)
  while (lines.length > 0 && lines[0].trim() === "") {
    lines.shift();
  }
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }

  // Calculate minimum indentation
  const minIndent = lines
    .filter((line) => line.trim() !== "")
    .reduce((min, line) => {
      const indent = line.match(/^ */)?.[0].length ?? 0;
      return Math.min(min, indent);
    }, Infinity);

  // Remove indentation
  return lines.map((line) => (line.trim() === "" ? "" : line.slice(minIndent))).join("\n");
}
