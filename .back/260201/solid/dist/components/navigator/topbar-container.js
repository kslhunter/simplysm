import { splitProps } from "solid-js";
import { topbarContainer } from "./topbar-container.css";
import "@simplysm/core-common";
const TopbarContainer = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return /* @__PURE__ */ React.createElement("div", { ...rest, class: [topbarContainer, local.class].filterExists().join(" ") }, local.children);
};
export {
  TopbarContainer
};
//# sourceMappingURL=topbar-container.js.map
