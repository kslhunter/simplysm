/**
 * 템플릿 문자열 태그 함수들
 * IDE 코드 하이라이팅 지원용 (실제 동작은 문자열 조합 + 들여쓰기 정리)
 */
/**
 * JavaScript 코드 하이라이팅용 템플릿 태그
 * @param strings 템플릿 문자열 배열
 * @param values 보간된 값들
 * @returns 들여쓰기가 정리된 문자열
 * @example
 * const code = js`
 *   function hello() {
 *     return "world";
 *   }
 * `;
 */
export declare function js(strings: TemplateStringsArray, ...values: unknown[]): string;
/**
 * TypeScript 코드 하이라이팅용 템플릿 태그
 * @param strings 템플릿 문자열 배열
 * @param values 보간된 값들
 * @returns 들여쓰기가 정리된 문자열
 * @example
 * const code = ts`
 *   interface User {
 *     name: string;
 *     age: number;
 *   }
 * `;
 */
export declare function ts(strings: TemplateStringsArray, ...values: unknown[]): string;
/**
 * HTML 마크업 하이라이팅용 템플릿 태그
 * @param strings 템플릿 문자열 배열
 * @param values 보간된 값들
 * @returns 들여쓰기가 정리된 문자열
 * @example
 * const markup = html`
 *   <div class="container">
 *     <span>${name}</span>
 *   </div>
 * `;
 */
export declare function html(strings: TemplateStringsArray, ...values: unknown[]): string;
/**
 * MSSQL T-SQL 하이라이팅용 템플릿 태그
 * @param strings 템플릿 문자열 배열
 * @param values 보간된 값들
 * @returns 들여쓰기가 정리된 문자열
 * @example
 * const query = tsql`
 *   SELECT TOP 10 *
 *   FROM Users
 *   WHERE Name LIKE '%${keyword}%'
 * `;
 */
export declare function tsql(strings: TemplateStringsArray, ...values: unknown[]): string;
/**
 * MySQL SQL 하이라이팅용 템플릿 태그
 * @param strings 템플릿 문자열 배열
 * @param values 보간된 값들
 * @returns 들여쓰기가 정리된 문자열
 * @example
 * const query = mysql`
 *   SELECT *
 *   FROM users
 *   LIMIT 10
 * `;
 */
export declare function mysql(strings: TemplateStringsArray, ...values: unknown[]): string;
/**
 * PostgreSQL SQL 하이라이팅용 템플릿 태그
 * @param strings 템플릿 문자열 배열
 * @param values 보간된 값들
 * @returns 들여쓰기가 정리된 문자열
 * @example
 * const query = pgsql`
 *   SELECT *
 *   FROM users
 *   OFFSET 0 LIMIT 10
 * `;
 */
export declare function pgsql(strings: TemplateStringsArray, ...values: unknown[]): string;
//# sourceMappingURL=template-strings.d.ts.map
