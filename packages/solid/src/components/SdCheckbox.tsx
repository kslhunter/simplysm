import { type JSX, mergeProps, type ParentProps, Show, splitProps, createSignal, untrack } from "solid-js";
import { twJoin } from "tailwind-merge";
import { tv, type VariantProps } from "tailwind-variants";
import { ripple } from "../directives/ripple";
import { IconCheck } from "@tabler/icons-solidjs";
import type { IconComponent } from "../types/icon.types";

// ripple directive를 사용하기 위해 참조
void ripple;

/**
 * 체크박스 스타일 variants
 *
 * @remarks
 * 체크박스 컴포넌트에 사용되는 스타일 variants.
 * slots 기반으로 root, indicator, icon, content 영역을 정의한다.
 */
export const checkboxVariants = tv({
  slots: {
    root: twJoin(
      "inline-flex",
      "items-center",
      "cursor-pointer",
      "select-none",
      "px-ctrl",
      "py-ctrl-sm",
      "border",
      "border-transparent",
      "rounded-sm",
      "gap-2",
    ),
    indicator: twJoin(
      "inline-flex",
      "items-center",
      "justify-center",
      "w-4",
      "h-4",
      "border",
      "bg-bg-elevated",
      "rounded-sm",
      "transition-colors",
      "duration-100",
    ),
    icon: twJoin("opacity-0", "text-white", "transition-opacity", "duration-100"),
    content: "inline-block",
  },
  variants: {
    checked: {
      true: {
        indicator: twJoin("bg-primary", "border-primary"),
        icon: "opacity-100",
      },
    },
    theme: {
      primary: { indicator: "border-primary/30" },
      secondary: { indicator: "border-secondary/30" },
      info: { indicator: "border-info/30" },
      success: { indicator: "border-success/30" },
      warning: { indicator: "border-warning/30" },
      danger: { indicator: "border-danger/30" },
      gray: { indicator: "border-gray/30" },
      "slate": { indicator: "border-slate/30" },
    },
    size: {
      sm: {
        root: twJoin("px-ctrl-sm", "py-ctrl-xs", "gap-1"),
        indicator: twJoin("w-3.5", "h-3.5"),
      },
      lg: {
        root: twJoin("px-ctrl-lg", "py-ctrl", "gap-3"),
        indicator: twJoin("w-5", "h-5"),
      },
    },
    inline: {
      true: {
        root: twJoin("p-0", "border-none", "h-auto", "w-auto"),
      },
    },
    inset: {
      true: {
        root: twJoin("border-none", "rounded-none", "justify-center", `
          text-center
        `),
      },
    },
    disabled: {
      true: {
        root: twJoin("opacity-30", "pointer-events-none", "cursor-not-allowed"),
      },
    },
  },
  compoundVariants: [
    // theme은 checked가 true일 때만 적용
    { checked: true, theme: "primary", class: { indicator: twJoin("bg-primary", `
      border-primary
    `) } },
    { checked: true, theme: "secondary", class: { indicator: twJoin(`
      bg-secondary
    `, `border-secondary`) } },
    { checked: true, theme: "info", class: { indicator: twJoin("bg-info", `
      border-info
    `) } },
    { checked: true, theme: "success", class: { indicator: twJoin("bg-success", `
      border-success
    `) } },
    { checked: true, theme: "warning", class: { indicator: twJoin("bg-warning", `
      border-warning
    `) } },
    { checked: true, theme: "danger", class: { indicator: twJoin("bg-danger", `
      border-danger
    `) } },
    { checked: true, theme: "gray", class: { indicator: twJoin("bg-gray", `
      border-gray
    `) } },
    { checked: true, theme: "slate", class: { indicator: twJoin("bg-slate", `
      border-slate
    `) } },
  ],
});

/**
 * checkboxVariants의 variant props 타입
 */
export type CheckboxVariantProps = VariantProps<typeof checkboxVariants>;

/**
 * SdCheckbox 컴포넌트의 Props 타입
 *
 * @remarks
 * - `value` - controlled 모드에서 체크 상태
 * - `defaultValue` - uncontrolled 모드에서 초기 체크 상태
 * - `onChange` - 체크 상태 변경 시 호출되는 콜백
 * - `canChangeFn` - 값 변경 전 호출되어 false 반환 시 변경 차단
 * - `icon` - 체크 아이콘 컴포넌트 (기본값: IconCheck)
 * - `disabled` - 비활성화 상태
 * - `size` - 크기 (sm, lg)
 * - `inline` - 인라인 스타일 (패딩/테두리 제거)
 * - `inset` - 부모 요소에 삽입되는 형태
 * - `theme` - 테마 색상
 * - `contentStyle` - 컨텐츠 영역 커스텀 스타일
 */
export interface SdCheckboxProps
  extends ParentProps,
    Omit<JSX.HTMLAttributes<HTMLDivElement>, "children" | "onChange">,
    VariantProps<typeof checkboxVariants> {
  value?: boolean;
  defaultValue?: boolean;
  onChange?: (value: boolean) => void;
  canChangeFn?: (newValue: boolean) => boolean | Promise<boolean>;
  icon?: IconComponent;
  contentStyle?: JSX.CSSProperties;
}

/**
 * 체크박스 컴포넌트
 *
 * @remarks
 * Controlled/Uncontrolled 모드를 모두 지원한다.
 * `value` prop이 있으면 controlled, 없으면 uncontrolled 모드로 동작한다.
 */
export function SdCheckbox(props: SdCheckboxProps) {
  const merged = mergeProps(
    {
      defaultValue: false,
      disabled: false,
      icon: IconCheck,
    },
    props,
  );

  const [local, rest] = splitProps(merged, [
    "value",
    "defaultValue",
    "onChange",
    "canChangeFn",
    "icon",
    "disabled",
    "size",
    "inline",
    "inset",
    "theme",
    "contentStyle",
    "class",
    "children",
  ]);

  // Controlled vs Uncontrolled
  const [internalValue, setInternalValue] = createSignal(untrack(() => local.defaultValue));
  const isControlled = () => local.value !== undefined;
  const isChecked = () => (isControlled() ? local.value! : internalValue());

  // 스타일 계산
  const styles = () =>
    checkboxVariants({
      checked: isChecked(),
      theme: local.theme,
      size: local.size,
      inline: local.inline,
      inset: local.inset,
      disabled: local.disabled,
    });

  // 값 변경 핸들러 (canChangeFn 비동기 검증 포함)
  const handleChange = async () => {
    if (local.disabled) return;

    const newValue = !isChecked();

    if (local.canChangeFn) {
      const canChange = await local.canChangeFn(newValue);
      if (!canChange) return;
    }

    if (isControlled()) {
      local.onChange?.(newValue);
    } else {
      setInternalValue(newValue);
      local.onChange?.(newValue);
    }
  };

  // 키보드 이벤트 (Space)
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === " ") {
      e.preventDefault();
      void handleChange();
    }
  };

  return (
    <div
      use:ripple={!local.disabled}
      class={styles().root({ class: local.class })}
      tabindex={local.disabled ? undefined : 0}
      role="checkbox"
      aria-checked={isChecked()}
      aria-disabled={local.disabled}
      onClick={() => void handleChange()}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      <div class={styles().indicator({ class: !local.theme ? "border-black/10 dark:border-white/10" : undefined })}>
        {local.icon({ size: "1em", class: styles().icon() })}
      </div>
      <Show when={local.children}>
        <div class={styles().content()} style={local.contentStyle}>
          {local.children}
        </div>
      </Show>
    </div>
  );
}
