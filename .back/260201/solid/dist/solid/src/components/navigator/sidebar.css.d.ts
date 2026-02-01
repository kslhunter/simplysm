import { type RecipeVariants } from "@vanilla-extract/recipes";
/**
 * Sidebar 패널 스타일
 *
 * toggled 변수는 "토글 버튼을 눌렀는가"를 의미하며,
 * 데스크톱과 모바일에서 반대로 동작한다:
 * - 데스크톱: toggled=false → 표시(기본), toggled=true → 숨김
 * - 모바일: toggled=false → 숨김(기본), toggled=true → 표시(오버레이)
 *
 * 주의: width는 Sidebar 컴포넌트에서 inline style로 처리됨 (Context에서 가져옴)
 */
export declare const sidebar: import("@vanilla-extract/recipes").RuntimeFn<{
    toggled: {
        false: {
            "@media": {
                "not all and (max-width: 520px)": {
                    transition: `transform var(--${string}) ease-out`;
                };
                "(max-width: 520px)": {
                    transform: "translateX(-100%)";
                    transition: `transform var(--${string}) ease-in`;
                };
            };
        };
        true: {
            "@media": {
                "not all and (max-width: 520px)": {
                    transform: "translateX(-100%)";
                    transition: `transform var(--${string}) ease-in`;
                };
                "(max-width: 520px)": {
                    transform: "none";
                    transition: `transform var(--${string}) ease-out`;
                    boxShadow: `var(--${string})`;
                };
            };
        };
    };
}>;
export type SidebarStyles = NonNullable<RecipeVariants<typeof sidebar>>;
//# sourceMappingURL=sidebar.css.d.ts.map