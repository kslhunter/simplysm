import "@simplysm/core-common";
import { createSignal, type JSX, type ParentComponent, splitProps } from "solid-js";
import { combineStyle } from "@solid-primitives/props";
import { SidebarContext, type SidebarContextValue } from "./sidebar-context";
import { sidebarBackdrop, sidebarContainer } from "./sidebar-container.css";

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

export const SidebarContainer: ParentComponent<SidebarContainerProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "toggled",
    "onToggledChange",
    "width",
    "class",
    "style",
    "children",
  ]);

  // Controlled/Uncontrolled 혼합 패턴
  // toggled=false가 기본 상태 (데스크톱: 표시, 모바일: 숨김)
  const [internalToggled, setInternalToggled] = createSignal(false);
  const toggled = () => local.toggled ?? internalToggled();
  const setToggled = (value: boolean) => {
    if (local.toggled === undefined) {
      setInternalToggled(value);
    }
    local.onToggledChange?.(value);
  };
  const toggle = () => setToggled(!toggled());

  const width = () => local.width ?? "16rem";

  const contextValue: SidebarContextValue = {
    toggled,
    setToggled,
    toggle,
    width,
  };

  const handleBackdropClick = () => {
    // 모바일에서 backdrop 클릭 시 기본 상태로 복귀 (사이드바 숨김)
    setToggled(false);
  };

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        {...rest}
        class={[sidebarContainer(), local.class].filter(Boolean).join(" ")}
        style={combineStyle(local.style, { "padding-left": !toggled() ? width() : "0" })}
      >
        <div class={sidebarBackdrop({ toggled: toggled() })} onClick={handleBackdropClick} />
        {local.children}
      </div>
    </SidebarContext.Provider>
  );
};
