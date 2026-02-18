import { type Component, Show } from "solid-js";
import { textMuted } from "../../../styles/tokens.styles";

/** 값이 없을 때 placeholder 또는 NBSP를 표시하는 공유 컴포넌트 */
export const PlaceholderFallback: Component<{ value?: string; placeholder?: string }> = (props) => (
  <>
    <Show
      when={props.value}
      fallback={
        <Show when={props.placeholder != null && props.placeholder !== ""} fallback={"\u00A0"}>
          <span class={textMuted}>{props.placeholder}</span>
        </Show>
      }
    >
      {props.value}
    </Show>
  </>
);
