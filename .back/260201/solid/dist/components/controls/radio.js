import { createSignal, splitProps } from "solid-js";
import { radio, radioIndicator, radioInnerDot, radioContents } from "./radio.css";
import { ripple } from "../../directives/ripple";
import "@simplysm/core-common";
import { objPick } from "@simplysm/core-common";
void ripple;
const Radio = (props) => {
  const [local, rest] = splitProps(props, [
    ...radio.variants(),
    "class",
    "children",
    "checked",
    "onChange",
    "disabled"
  ]);
  const [internalChecked, setInternalChecked] = createSignal(local.checked ?? false);
  const isControlled = () => local.onChange !== void 0;
  const currentChecked = () => isControlled() ? local.checked ?? false : internalChecked();
  const handleChange = () => {
    var _a;
    if (isControlled()) {
      (_a = local.onChange) == null ? void 0 : _a.call(local, true);
    } else {
      setInternalChecked(true);
    }
  };
  return /* @__PURE__ */ React.createElement(
    "label",
    {
      "use:ripple": true,
      ...rest,
      class: [
        radio({
          ...objPick(local, radio.variants()),
          checked: currentChecked(),
          disabled: local.disabled
        }),
        local.class
      ].filter(Boolean).join(" ")
    },
    /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "radio",
        checked: currentChecked(),
        disabled: local.disabled,
        style: { position: "absolute", opacity: 0, "pointer-events": "none" },
        onChange: handleChange
      }
    ),
    /* @__PURE__ */ React.createElement("span", { class: radioIndicator }, /* @__PURE__ */ React.createElement("span", { class: radioInnerDot })),
    /* @__PURE__ */ React.createElement("span", { class: radioContents }, local.children)
  );
};
export {
  Radio
};
//# sourceMappingURL=radio.js.map
