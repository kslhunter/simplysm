import { type Component, Show } from "solid-js";
import { text } from "../../../styles/base.styles";

/** Shared component to display placeholder or NBSP when value is empty */
export const PlaceholderFallback: Component<{ value?: string; placeholder?: string }> = (props) => (
  <>
    <Show
      when={props.value}
      fallback={
        <Show when={props.placeholder != null && props.placeholder !== ""} fallback={"\u00A0"}>
          <span class={text.muted}>{props.placeholder}</span>
        </Show>
      }
    >
      {props.value}
    </Show>
  </>
);
