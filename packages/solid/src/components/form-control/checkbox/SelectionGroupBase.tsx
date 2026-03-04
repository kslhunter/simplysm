import {
  type Context,
  type JSX,
  createMemo,
  splitProps,
} from "solid-js";
import { twMerge } from "tailwind-merge";
import { Invalid } from "../Invalid";
import { useI18n } from "../../../providers/i18n/I18nContext";

export interface SelectionGroupBaseProps {
  required?: boolean;
  touchMode?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}

export function SelectionGroupBase<TContextValue>(props: SelectionGroupBaseProps & {
  context: Context<TContextValue | undefined>;
  contextValue: TContextValue;
  errorMsgKey: string;
  value: unknown;
  isEmpty: (value: unknown) => boolean;
  validate?: ((value: any) => string | undefined) | undefined;
}) {
  const i18n = useI18n();
  const resolvedErrorMsg = () => i18n.t(props.errorMsgKey);
  const [local, rest] = splitProps(props, [
    "context",
    "contextValue",
    "errorMsgKey",
    "value",
    "isEmpty",
    "validate",
    "required",
    "touchMode",
    "class",
    "style",
    "children",
  ]);

  const errorMsg = createMemo(() => {
    if (local.required && local.isEmpty(local.value)) return resolvedErrorMsg();
    return local.validate?.(local.value);
  });

  return (
    <Invalid message={errorMsg()} variant="dot" touchMode={local.touchMode}>
      <local.context.Provider value={local.contextValue}>
        <div {...rest} class={twMerge("inline-flex", local.class)} style={local.style}>
          {local.children}
        </div>
      </local.context.Provider>
    </Invalid>
  );
}
