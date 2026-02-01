import "@simplysm/core-common";
import { splitProps } from "solid-js";
import { sidebar } from "./sidebar.css";
import { useSidebar } from "./sidebar-context";
import { combineStyle } from "@solid-primitives/props";
const Sidebar = (props) => {
  const [local, rest] = splitProps(props, ["class", "style", "children"]);
  const { toggled, width } = useSidebar();
  return /* @__PURE__ */ React.createElement(
    "aside",
    {
      ...rest,
      class: [sidebar({ toggled: toggled() }), local.class].filterExists().join(" "),
      style: combineStyle(local.style, { width: width() })
    },
    local.children
  );
};
export {
  Sidebar
};
//# sourceMappingURL=sidebar.js.map
