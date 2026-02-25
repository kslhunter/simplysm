/**
 * Whether development mode is enabled
 *
 * Substituted at build time:
 * - Library build: Not substituted (kept as-is)
 * - Client/Server build: Substituted with `define: { '__DEV__': 'true/false' }`
 */
export {};

declare global {
  const __DEV__: boolean;
}
