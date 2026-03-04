import type { JSX } from "solid-js";
import { type Context, onCleanup, type ParentComponent, useContext } from "solid-js";

type SlotSetter = (value: (() => JSX.Element) | undefined) => void;

/**
 * Factory function that creates a slot registration component.
 *
 * @param context - Context to register the slot in
 * @param getSetter - Function to extract the setter from the context value
 */
export function createSlotComponent<TCtx>(
  context: Context<TCtx | undefined>,
  getSetter: (ctx: TCtx) => SlotSetter,
): ParentComponent {
  return (props) => {
    const ctx = useContext(context)!;
    getSetter(ctx)(() => props.children);
    onCleanup(() => getSetter(ctx)(undefined));
    return null;
  };
}
