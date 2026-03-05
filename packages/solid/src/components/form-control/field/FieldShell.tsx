import clsx from "clsx";
import { type JSX, type ParentComponent, Show } from "solid-js";
import { twMerge } from "tailwind-merge";
import { Invalid } from "../Invalid";

export interface FieldShellProps {
  /** Validation error message */
  errorMsg: string | undefined;
  /** Invalid visual indicator variant */
  invalidVariant: "dot" | "border";
  /** Show error only after blur */
  lazyValidation?: boolean;

  /** Inset (borderless) mode */
  inset: boolean | undefined;
  /** Whether the field is editable (!disabled && !readonly) */
  isEditable: boolean;

  /** Wrapper class generator — receives includeCustomClass flag */
  wrapperClass: (includeCustomClass: boolean) => string;
  /** Data attribute name for the wrapper (e.g. "data-date-field") */
  dataAttr: string;
  /** Extra class for standalone-readonly wrapper (e.g. "sd-date-field") */
  readonlyExtraClass?: string;
  /** Extra class for inset outer div (e.g. "[text-decoration:inherit]") */
  insetExtraClass?: string;
  /** Extra class for sizing/overlay wrappers (e.g. "justify-end") */
  sizingExtraClass?: string;

  /** Custom style */
  style?: JSX.CSSProperties;
  /** Title (tooltip) */
  title?: string;
  /** Custom class — applied to inset outer div */
  class?: string;
  /** Rest props from splitProps — spread on wrapper divs */
  rest?: Record<string, unknown>;

  /** Content for readonly display and default sizing */
  displayContent: JSX.Element;
  /** Override sizing content (e.g. Textarea's contentForHeight) */
  renderSizing?: () => JSX.Element;
}

export const FieldShell: ParentComponent<FieldShellProps> = (props) => {
  const dataAttrObj = () => ({ [props.dataAttr]: true });
  const dataContentAttrObj = () => ({ [`${props.dataAttr}-content`]: true });

  return (
    <Invalid
      message={props.errorMsg}
      variant={props.invalidVariant}
      lazyValidation={props.lazyValidation}
    >
      <Show
        when={props.inset}
        fallback={
          <Show
            when={props.isEditable}
            fallback={
              <div
                {...(props.rest ?? {})}
                {...dataAttrObj()}
                class={twMerge(props.wrapperClass(true), props.readonlyExtraClass)}
                style={props.style}
                title={props.title}
              >
                {props.displayContent}
              </div>
            }
          >
            <div
              {...(props.rest ?? {})}
              {...dataAttrObj()}
              class={props.wrapperClass(true)}
              style={{ position: "relative", ...props.style }}
            >
              {props.children}
            </div>
          </Show>
        }
      >
        <div
          {...(props.rest ?? {})}
          {...dataAttrObj()}
          class={clsx("relative", props.insetExtraClass, props.class)}
          style={props.style}
        >
          <div
            {...dataContentAttrObj()}
            class={twMerge(props.wrapperClass(false), props.sizingExtraClass)}
            style={{ visibility: props.isEditable ? "hidden" : undefined }}
            title={props.title}
          >
            {props.renderSizing ? props.renderSizing() : props.displayContent}
          </div>

          <Show when={props.isEditable}>
            <div
              class={twMerge(
                props.wrapperClass(false),
                props.sizingExtraClass,
                "absolute left-0 top-0 size-full",
              )}
            >
              {props.children}
            </div>
          </Show>
        </div>
      </Show>
    </Invalid>
  );
};
