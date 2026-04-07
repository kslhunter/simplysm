/**
 * TypecheckOrchestrator에 위임하는 CLI 래퍼.
 * 타입과 executeTypecheck를 re-export하여 기존 호출자와의 호환성을 유지한다.
 */
export {
  executeTypecheck,
  type TypecheckOptions,
  type TypecheckResult,
} from "../orchestrators/TypecheckOrchestrator";
