import { type RecipeVariants } from "@vanilla-extract/recipes";
/**
 * SidebarContainer 최외곽 컨테이너 스타일
 * 전체 레이아웃을 감싸며, 사이드바 열림 상태에 따라 메인 콘텐츠의 여백을 조정한다.
 * - 데스크톱: open=true → padding-left 적용 (inline style), open=false → padding-left: 0
 * - 모바일: padding-left 항상 0 (오버레이 모드)
 *
 * 주의: paddingLeft는 SidebarContainer 컴포넌트에서 inline style로 처리됨
 */
export declare const sidebarContainer: import("@vanilla-extract/recipes").RuntimeFn<{
  [x: string]: {
    [x: string]: string | import("@vanilla-extract/css").ComplexStyleRule;
  };
}>;
export type SidebarContainerStyles = NonNullable<RecipeVariants<typeof sidebarContainer>>;
/**
 * 모바일에서 사이드바가 토글되었을 때 표시되는 백드롭 오버레이
 * max-width: 520px에서만 표시
 *
 * toggled=true일 때 모바일에서 사이드바가 표시되므로 백드롭도 표시
 */
export declare const sidebarBackdrop: import("@vanilla-extract/recipes").RuntimeFn<{
  toggled: {
    true: {
      "@media": {
        "(max-width: 520px)": {
          opacity: `var(--${string})`;
          pointerEvents: "auto";
        };
      };
    };
    false: {};
  };
}>;
//# sourceMappingURL=sidebar-container.css.d.ts.map
