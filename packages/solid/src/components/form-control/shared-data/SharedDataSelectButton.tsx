import { type JSX, splitProps } from "solid-js";
import { type SharedDataAccessor } from "../../../providers/shared-data/SharedDataContext";
import {
  DataSelectButton,
  type DataSelectButtonProps,
} from "../data-select-button/DataSelectButton";
import { type ComponentSize } from "../../../styles/tokens.styles";

/** SharedDataSelectButton Props */
export interface SharedDataSelectButtonProps<TItem> {
  /** 공유 데이터 접근자 */
  data: SharedDataAccessor<TItem>;

  /** 현재 선택된 키 (단일 또는 다중) */
  value?: DataSelectButtonProps<TItem>["value"];
  /** 값 변경 콜백 */
  onValueChange?: DataSelectButtonProps<TItem>["onValueChange"];
  /** 다중 선택 모드 */
  multiple?: boolean;
  /** 필수 입력 */
  required?: boolean;
  /** 비활성화 */
  disabled?: boolean;
  /** 트리거 크기 */
  size?: ComponentSize;
  /** 테두리 없는 스타일 */
  inset?: boolean;

  /** 선택 모달 컴포넌트 팩토리 */
  modal: () => JSX.Element;
  /** 아이템 렌더링 함수 */
  children: (item: TItem) => JSX.Element;
}

export function SharedDataSelectButton<TItem>(
  props: SharedDataSelectButtonProps<TItem>,
): JSX.Element {
  const [local, rest] = splitProps(props, ["data", "children"]);

  return (
    <DataSelectButton
      load={(keys) => local.data.items().filter((item) => keys.includes(local.data.getKey(item)))}
      renderItem={local.children}
      {...rest}
    />
  );
}
