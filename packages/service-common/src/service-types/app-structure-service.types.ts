import type { AppStructureItem } from "../app-structure/app-structure.types";

/**
 * AppStructure 서비스 인터페이스
 *
 * 서버에 등록된 앱 구조 항목을 클라이언트명 기준 맵으로 조회한다.
 */
export interface AppStructureService {
  getItems(): Record<string, AppStructureItem[]>;
}
