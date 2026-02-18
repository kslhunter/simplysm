import "@simplysm/core-common";
import { createSignal, splitProps } from "solid-js";
import { combineStyle } from "@solid-primitives/props";
import { SidebarContext } from "./sidebar-context";
import { sidebarBackdrop, sidebarContainer } from "./sidebar-container.css";
const SidebarContainer = (props) => {
  const [local, rest] = splitProps(props, [
    "toggled",
    "onToggledChange",
    "width",
    "class",
    "style",
    "children",
  ]);
  const [internalToggled, setInternalToggled] = createSignal(false);
  const toggled = () => local.toggled ?? internalToggled();
  const setToggled = (value) => {
    var _a;
    if (local.toggled === void 0) {
      setInternalToggled(value);
    }
    (_a = local.onToggledChange) == null ? void 0 : _a.call(local, value);
  };
  const toggle = () => setToggled(!toggled());
  const width = () => local.width ?? "16rem";
  const contextValue = {
    toggled,
    setToggled,
    toggle,
    width,
  };
  const handleBackdropClick = () => {
    setToggled(false);
  };
  return /* @__PURE__ */ React.createElement(
    SidebarContext.Provider,
    { value: contextValue },
    /* @__PURE__ */ React.createElement(
      "div",
      {
        ...rest,
        class: [sidebarContainer(), local.class].filterExists().join(" "),
        style: combineStyle(local.style, { "padding-left": !toggled() ? width() : "0" }),
      },
      /* @__PURE__ */ React.createElement("div", {
        class: sidebarBackdrop({ toggled: toggled() }),
        onClick: handleBackdropClick,
      }),
      local.children,
    ),
  );
};
export { SidebarContainer };
//# sourceMappingURL=sidebar-container.js.map
