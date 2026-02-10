import { splitProps } from "solid-js";
import { button } from "./button.css";
import { ripple } from "../../directives/ripple";
import "@simplysm/core-common";
import { objPick } from "@simplysm/core-common";
void ripple;
const Button = (props) => {
  const [local, rest] = splitProps(props, [...button.variants(), "class", "children"]);
  return /* @__PURE__ */ React.createElement(
    "button",
    {
      "use:ripple": true,
      ...rest,
      "class": [button(objPick(local, button.variants())), local.class].filterExists().join(" "),
    },
    local.children,
  );
};
export { Button };
//# sourceMappingURL=button.js.map
