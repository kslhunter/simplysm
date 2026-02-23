import { type Context, type ParentComponent, onCleanup, useContext } from "solid-js";
import type { JSX } from "solid-js";

type SlotSetter = (value: (() => JSX.Element) | undefined) => void;

/**
 * Slot 등록 컴포넌트를 생성하는 팩토리 함수
 *
 * @param context - slot을 등록할 Context
 * @param getSetter - context value에서 setter를 추출하는 함수
 */
export function createSlotComponent<TCtx>(
  context: Context<TCtx | undefined>,
  getSetter: (ctx: TCtx) => SlotSetter,
): ParentComponent {
  return (props) => {
    const ctx = useContext(context)!;
    // eslint-disable-next-line solid/reactivity -- slot 등록은 초기 마운트 시 한 번만 수행
    getSetter(ctx)(() => props.children);
    onCleanup(() => getSetter(ctx)(undefined));
    return null;
  };
}
