import { createSignal, type Accessor, type JSX } from "solid-js";

export type SlotAccessor = (() => JSX.Element) | undefined;

/**
 * 슬롯 등록용 signal 생성
 *
 * @returns [accessor, setter] — setter는 함수를 값으로 저장하기 위해 래핑 처리
 */
export function createSlotSignal(): [Accessor<SlotAccessor>, (content: SlotAccessor) => void] {
  const [slot, _setSlot] = createSignal<SlotAccessor>();
  const setSlot = (content: SlotAccessor) => _setSlot(() => content);
  return [slot, setSlot];
}
