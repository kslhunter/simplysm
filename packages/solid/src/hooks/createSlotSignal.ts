import { createSignal, type Accessor, type JSX } from "solid-js";

export type SlotAccessor = (() => JSX.Element) | undefined;

/**
 * Creates a signal for slot registration.
 *
 * @returns [accessor, setter] -- setter is wrapped to store a function as a value
 */
export function createSlotSignal(): [Accessor<SlotAccessor>, (content: SlotAccessor) => void] {
  const [slot, _setSlot] = createSignal<SlotAccessor>();
  const setSlot = (content: SlotAccessor) => _setSlot(() => content);
  return [slot, setSlot];
}
