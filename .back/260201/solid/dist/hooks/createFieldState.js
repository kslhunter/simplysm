import { createSignal } from "solid-js";
function createFieldState(options) {
  const [internalValue, setInternalValue] = createSignal(options.value());
  const isControlled = () => options.onChange() !== void 0;
  const currentValue = () => isControlled() ? options.value() : internalValue();
  const setValue = (value) => {
    var _a;
    if (isControlled()) {
      (_a = options.onChange()) == null ? void 0 : _a(value);
    } else {
      setInternalValue(() => value);
    }
  };
  return {
    currentValue,
    setValue,
    isControlled
  };
}
export {
  createFieldState
};
//# sourceMappingURL=createFieldState.js.map
