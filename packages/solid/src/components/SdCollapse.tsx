import { type ParentProps, createEffect, createSignal, mergeProps, onCleanup, splitProps } from "solid-js";
import { twJoin } from "tailwind-merge";

export interface SdCollapseProps extends ParentProps {
  /** 열림 상태 */
  open?: boolean;
  /** 커스텀 클래스 */
  class?: string;
}

/**
 * 아코디언 콘텐츠 컴포넌트
 *
 * @remarks
 * `open` prop에 따라 높이 애니메이션으로 열림/닫힘 효과를 제공한다.
 * 내부 콘텐츠의 높이를 자동으로 계산하여 margin-top으로 애니메이션 처리한다.
 */
export function SdCollapse(props: SdCollapseProps) {
  const merged = mergeProps({ open: false }, props);
  const [local, rest] = splitProps(merged, ["open", "class", "children"]);

  let contentRef: HTMLDivElement | undefined;
  const [contentHeight, setContentHeight] = createSignal(0);

  // ResizeObserver + MutationObserver로 콘텐츠 높이 변경 감지
  createEffect(() => {
    if (!contentRef) return;

    const updateHeight = () => {
      setContentHeight(contentRef.scrollHeight);
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(contentRef);

    // MutationObserver 추가 - 동적 콘텐츠 변경 감지
    const mutationObserver = new MutationObserver(updateHeight);
    mutationObserver.observe(contentRef, {
      childList: true,
      subtree: true,
    });

    onCleanup(() => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    });
  });

  const marginTop = (): string => {
    return local.open ? "" : `-${contentHeight()}px`;
  };

  return (
    <div
      class={twJoin("block", "overflow-hidden", local.class)}
      data-sd-open={local.open}
      {...rest}
    >
      <div
        ref={contentRef}
        class={twJoin(
          local.open ? "transition-[margin-top] duration-100 ease-out" : `
            transition-[margin-top] duration-100 ease-in
          `,
        )}
        style={{ "margin-top": marginTop() }}
      >
        {local.children}
      </div>
    </div>
  );
}
