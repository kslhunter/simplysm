import { Show, splitProps } from "solid-js";
import { createFieldState } from "../../hooks/createFieldState";
import { timeField, timeFieldContainer, timeFieldContent, timeFieldInput } from "./time-field.css";
import { objPick, Time } from "@simplysm/core-common";
import "@simplysm/core-common";
const TimeField = (props) => {
  const [local, rest] = splitProps(props, [
    ...timeField.variants(),
    "class",
    "value",
    "onChange",
    "type",
    "min",
    "max",
    "placeholder",
  ]);
  const fieldState = createFieldState({
    value: () => local.value,
    onChange: () => local.onChange,
  });
  const step = () => (local.type === "time-sec" ? "1" : void 0);
  const inputValue = () => {
    const value = fieldState.currentValue();
    if (value === void 0) return "";
    if (local.type === "time-sec") {
      return value.toFormatString("HH:mm:ss");
    }
    return value.toFormatString("HH:mm");
  };
  const displayValue = () => {
    const value = fieldState.currentValue();
    if (value === void 0) return "";
    if (local.type === "time-sec") {
      return value.toFormatString("HH:mm:ss");
    }
    return value.toFormatString("HH:mm");
  };
  const minValue = () => {
    if (local.min === void 0) return void 0;
    if (local.type === "time-sec") {
      return local.min.toFormatString("HH:mm:ss");
    }
    return local.min.toFormatString("HH:mm");
  };
  const maxValue = () => {
    if (local.max === void 0) return void 0;
    if (local.type === "time-sec") {
      return local.max.toFormatString("HH:mm:ss");
    }
    return local.max.toFormatString("HH:mm");
  };
  const handleChange = (e) => {
    const input = e.currentTarget;
    if (input.value === "") {
      fieldState.setValue(void 0);
      return;
    }
    try {
      const parts = input.value.split(":").map(Number);
      if (parts.length >= 2) {
        const hour = parts[0];
        const minute = parts[1];
        const second = parts[2] ?? 0;
        if (
          hour !== void 0 &&
          minute !== void 0 &&
          !Number.isNaN(hour) &&
          !Number.isNaN(minute) &&
          !Number.isNaN(second) &&
          hour >= 0 &&
          hour <= 23 &&
          minute >= 0 &&
          minute <= 59 &&
          second >= 0 &&
          second <= 59
        ) {
          const newValue = new Time(hour, minute, second);
          fieldState.setValue(newValue);
        }
      }
    } catch {}
  };
  const inputProps = () => ({
    "type": "time",
    "value": inputValue(),
    "onChange": handleChange,
    "min": minValue(),
    "max": maxValue(),
    "step": step(),
    "placeholder": local.placeholder,
    "aria-disabled": rest.disabled ? "true" : void 0,
    "aria-readonly": rest.readOnly ? "true" : void 0,
  });
  return /* @__PURE__ */ React.createElement(
    Show,
    {
      when: local.inline,
      fallback: /* @__PURE__ */ React.createElement("input", {
        ...rest,
        ...inputProps(),
        class: [timeField(objPick(local, timeField.variants())), local.class]
          .filterExists()
          .join(" "),
      }),
    },
    /* @__PURE__ */ React.createElement(
      "div",
      { class: timeFieldContainer },
      /* @__PURE__ */ React.createElement(
        "div",
        { class: timeFieldContent },
        displayValue() !== "" ? displayValue() : (local.placeholder ?? "\xA0"),
      ),
      /* @__PURE__ */ React.createElement("input", {
        ...rest,
        ...inputProps(),
        class: [timeFieldInput, timeField(objPick(local, timeField.variants())), local.class]
          .filterExists()
          .join(" "),
      }),
    ),
  );
};
export { TimeField };
//# sourceMappingURL=time-field.js.map
