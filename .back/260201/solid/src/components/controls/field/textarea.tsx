import { type Component, type JSX, createEffect, splitProps } from "solid-js";
import { createFieldSignal } from "../../../hooks/createFieldSignal";
import { type TextareaStyles, textarea } from "./textarea.css";
import "@simplysm/core-common";

/**
 * Textarea 컴포넌트의 props
 * @property value - 현재 값 (onChange와 함께 사용 시 controlled, 단독 사용 시 초기값)
 * @property onChange - 값 변경 시 호출되는 콜백 (있으면 controlled 모드)
 * @property rows - 기본 행 수 (기본값: 3)
 * @property autoResize - 자동 높이 조절 (기본값: false)
 * @property resize - 수동 리사이즈 옵션 (기본값: vertical)
 * @property size - 필드 크기 (sm, lg)
 * @property inset - true일 경우 테이블 셀 등에서 사용하기 위한 인셋 스타일 적용
 */
export interface TextareaProps
  extends
    Omit<JSX.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange">,
    TextareaStyles {
  value?: string | undefined;
  onChange?: (value: string | undefined) => void;
  rows?: number;
  autoResize?: boolean;
  resize?: "none" | "vertical" | "horizontal" | "both";
}

/**
 * 여러 줄 텍스트 입력 컴포넌트
 *
 * @example
 * ```tsx
 * const [text, setText] = createSignal<string | undefined>("");
 * <Textarea value={text()} onChange={setText} />
 * <Textarea value={text()} onChange={setText} placeholder="내용 입력" />
 * <Textarea autoResize placeholder="자동 높이 조절" />
 * ```
 */
export const Textarea: Component<TextareaProps> = (props) => {
  let textareaRef: HTMLTextAreaElement | undefined;

  const [local, rest] = splitProps(props, [
    ...textarea.variants(),
    "class",
    "value",
    "onChange",
    "rows",
    "autoResize",
    "resize",
    "placeholder",
  ]);

  const [value, setValue] = createFieldSignal({
    value: () => local.value,
    onChange: () => local.onChange,
  });

  // autoResize 높이 조절 함수
  const adjustHeight = () => {
    if (!local.autoResize || textareaRef === undefined) return;

    // 높이 리셋 후 scrollHeight에 맞춤
    textareaRef.style.height = "auto";
    textareaRef.style.height = `${textareaRef.scrollHeight}px`;
  };

  // autoResize 기능: value 변경 시 높이 재계산
  createEffect(() => {
    // 명시적 의존성: value가 변경될 때마다 실행
    const _ = value();
    adjustHeight();
  });

  // 입력 핸들러
  const handleInput: JSX.EventHandler<HTMLTextAreaElement, InputEvent> = (e) => {
    let newValue: string | undefined = e.currentTarget.value;

    if (newValue === "") {
      newValue = undefined;
    }

    setValue(newValue);
  };

  // 표시할 값 계산
  const displayValue = () => value() ?? "";

  // resize variant 결정
  const resizeVariant = () => {
    if (local.autoResize) return undefined; // autoResize가 있으면 compoundVariants가 처리
    return local.resize;
  };

  return (
    <textarea
      {...rest}
      ref={(el) => {
        textareaRef = el;
        // 초기 렌더링 후 높이 조절 (microtask로 DOM 업데이트 대기)
        queueMicrotask(adjustHeight);
      }}
      value={displayValue()}
      onInput={handleInput}
      rows={local.rows ?? 3}
      placeholder={local.placeholder}
      aria-disabled={rest.disabled ? ("true" as const) : undefined}
      aria-readonly={rest.readOnly ? ("true" as const) : undefined}
      class={[
        textarea({
          size: local.size,
          inset: local.inset,
          autoResize: local.autoResize,
          resize: resizeVariant(),
        }),
        local.class,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
};
