import { type ParentProps, mergeProps, splitProps } from "solid-js";
import { twJoin, twMerge } from "tailwind-merge";

export interface SdListProps extends ParentProps {
  /** 인셋 모드 (투명 배경) */
  inset?: boolean;
  /** 커스텀 클래스 */
  class?: string;
}

/**
 * 리스트 컨테이너 컴포넌트
 *
 * @remarks
 * `inset` 속성이 true일 때 투명 배경이 적용된다.
 */
export function SdList(props: SdListProps) {
  const merged = mergeProps({ inset: false }, props);
  const [local, rest] = splitProps(merged, ["inset", "class", "children"]);

  return (
    <div
      class={twMerge(
        twJoin(
          "flex",
          "flex-col",
          "select-none",
          "overflow-hidden",
          local.inset ? "bg-transparent" : twJoin("bg-bg-elevated", "rounded-sm"),
        ),
        local.class,
      )}
      data-sd-inset={local.inset}
      {...rest}
    >
      {local.children}
    </div>
  );
}
