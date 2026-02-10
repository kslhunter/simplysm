import "@simplysm/core-common";
import { type JSX, type ParentComponent } from "solid-js";
/**
 * SidebarContainer 컴포넌트의 props
 *
 * toggled는 "토글 버튼을 눌렀는가"를 의미하며,
 * 데스크톱과 모바일에서 반대로 동작한다:
 * - 데스크톱: toggled=false → 표시(기본), toggled=true → 숨김
 * - 모바일: toggled=false → 숨김(기본), toggled=true → 표시
 *
 * @property toggled - 사이드바 토글 상태 (controlled 모드)
 * @property onToggledChange - 사이드바 토글 상태 변경 콜백
 * @property width - 사이드바 너비 (기본값: "16rem")
 */
export interface SidebarContainerProps extends JSX.HTMLAttributes<HTMLDivElement> {
  toggled?: boolean;
  onToggledChange?: (toggled: boolean) => void;
  width?: string;
}
export declare const SidebarContainer: ParentComponent<SidebarContainerProps>;
//# sourceMappingURL=sidebar-container.d.ts.map
