import { createSignal, Show, splitProps } from "solid-js";
import {
  checkbox,
  checkboxIndicator,
  checkboxIndicatorIcon,
  checkboxContents,
} from "./checkbox.css";
import { ripple } from "../../directives/ripple";
import "@simplysm/core-common";
import { objPick } from "@simplysm/core-common";
import { IconCheck, IconMinus } from "@tabler/icons-solidjs";
void ripple;
const Checkbox = (props) => {
  const [local, rest] = splitProps(props, [
    ...checkbox.variants(),
    "class",
    "children",
    "checked",
    "indeterminate",
    "onChange",
    "icon",
    "indeterminateIcon",
    "disabled",
  ]);
  const [internalChecked, setInternalChecked] = createSignal(local.checked ?? false);
  const isControlled = () => local.onChange !== void 0;
  const currentChecked = () => (isControlled() ? (local.checked ?? false) : internalChecked());
  const handleChange = () => {
    var _a;
    const newValue = !currentChecked();
    if (isControlled()) {
      (_a = local.onChange) == null ? void 0 : _a.call(local, newValue);
    } else {
      setInternalChecked(newValue);
    }
  };
  const Icon = () => {
    const IconComponent = local.icon ?? IconCheck;
    return /* @__PURE__ */ React.createElement(IconComponent, null);
  };
  const IndeterminateIcon = () => {
    const IconComponent = local.indeterminateIcon ?? IconMinus;
    return /* @__PURE__ */ React.createElement(IconComponent, null);
  };
  return /* @__PURE__ */ React.createElement(
    "label",
    {
      "use:ripple": true,
      ...rest,
      "class": [
        checkbox({
          ...objPick(local, checkbox.variants()),
          checked: currentChecked(),
          indeterminate: local.indeterminate ?? false,
          disabled: local.disabled,
        }),
        local.class,
      ]
        .filter(Boolean)
        .join(" "),
    },
    /* @__PURE__ */ React.createElement("input", {
      type: "checkbox",
      checked: currentChecked(),
      disabled: local.disabled,
      style: { "position": "absolute", "opacity": 0, "pointer-events": "none" },
      onChange: handleChange,
    }),
    /* @__PURE__ */ React.createElement(
      "span",
      { class: checkboxIndicator },
      /* @__PURE__ */ React.createElement(
        "span",
        {
          "class": checkboxIndicatorIcon,
          "data-checked": String(currentChecked() && !local.indeterminate),
          "data-indeterminate": String(local.indeterminate ?? false),
        },
        /* @__PURE__ */ React.createElement(
          Show,
          { when: local.indeterminate, fallback: /* @__PURE__ */ React.createElement(Icon, null) },
          /* @__PURE__ */ React.createElement(IndeterminateIcon, null),
        ),
      ),
    ),
    /* @__PURE__ */ React.createElement("span", { class: checkboxContents }, local.children),
  );
};
export { Checkbox };
//# sourceMappingURL=checkbox.js.map
