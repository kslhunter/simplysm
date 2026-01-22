import { type JSX, mergeProps, type ParentProps, splitProps } from "solid-js";
import { tv, type VariantProps } from "tailwind-variants";
import { tw } from "../utils/tw";

// 테마별 disabled 스타일
const themeDisabled = tw`disabled:bg-gray-300 disabled:border-gray-300 disabled:text-gray-500`;
const linkDisabled = tw`disabled:bg-transparent disabled:border-transparent disabled:text-gray-400`;

// tailwind-variants로 버튼 스타일 정의
const buttonVariants = tv({
  base: tw`inline-flex items-center justify-center border rounded font-semibold text-sm cursor-pointer select-none transition-colors duration-100 disabled:cursor-not-allowed`,
  variants: {
    theme: {
      "default": tw`bg-white border-gray-300 text-gray-800 hover:bg-gray-100 disabled:bg-white disabled:border-gray-300 disabled:text-gray-400`,
      "primary": tw`bg-blue-500 border-blue-500 text-white hover:bg-blue-600 ${themeDisabled}`,
      "secondary": tw`bg-indigo-500 border-indigo-500 text-white hover:bg-indigo-600 ${themeDisabled}`,
      "info": tw`bg-cyan-500 border-cyan-500 text-white hover:bg-cyan-600 ${themeDisabled}`,
      "success": tw`bg-green-500 border-green-500 text-white hover:bg-green-600 ${themeDisabled}`,
      "warning": tw`bg-amber-500 border-amber-500 text-white hover:bg-amber-600 ${themeDisabled}`,
      "danger": tw`bg-red-500 border-red-500 text-white hover:bg-red-600 ${themeDisabled}`,
      "gray": tw`bg-gray-500 border-gray-500 text-white hover:bg-gray-600 ${themeDisabled}`,
      "blue-gray": tw`bg-slate-500 border-slate-500 text-white hover:bg-slate-600 ${themeDisabled}`,
      "link": tw`border-transparent bg-transparent text-blue-500 hover:bg-gray-100 hover:text-blue-600 ${linkDisabled}`,
      "link-primary": tw`border-transparent bg-transparent text-blue-500 hover:bg-gray-100 hover:text-blue-600 ${linkDisabled}`,
      "link-secondary": tw`border-transparent bg-transparent text-indigo-500 hover:bg-gray-100 hover:text-indigo-600 ${linkDisabled}`,
      "link-info": tw`border-transparent bg-transparent text-cyan-500 hover:bg-gray-100 hover:text-cyan-600 ${linkDisabled}`,
      "link-success": tw`border-transparent bg-transparent text-green-500 hover:bg-gray-100 hover:text-green-600 ${linkDisabled}`,
      "link-warning": tw`border-transparent bg-transparent text-amber-500 hover:bg-gray-100 hover:text-amber-600 ${linkDisabled}`,
      "link-danger": tw`border-transparent bg-transparent text-red-500 hover:bg-gray-100 hover:text-red-600 ${linkDisabled}`,
      "link-gray": tw`border-transparent bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-600 ${linkDisabled}`,
      "link-blue-gray": tw`border-transparent bg-transparent text-slate-500 hover:bg-gray-100 hover:text-slate-600 ${linkDisabled}`,
      "link-rev": tw`border-transparent bg-transparent text-white hover:bg-white/10 hover:text-gray-200 disabled:bg-transparent disabled:border-transparent disabled:text-gray-500`,
    },
    size: {
      default: tw`px-3 py-1.5`,
      sm: tw`px-2 py-1 text-xs`,
      lg: tw`px-4 py-2 text-base`,
    },
    inset: {
      true: tw`rounded-none border-none text-blue-500 hover:text-blue-700`,
      false: "",
    },
  },
  compoundVariants: [
    {
      inset: true,
      class: tw`disabled:bg-white disabled:border-transparent disabled:text-gray-400`,
    },
  ],
  defaultVariants: {
    theme: "default",
    size: "default",
    inset: false,
  },
});

// Props 타입
export interface SdButtonProps
  extends
    ParentProps,
    Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "children">,
    VariantProps<typeof buttonVariants> {}

export function SdButton(props: SdButtonProps) {
  const merged = mergeProps({ type: "button" as const }, props);
  const [local, rest] = splitProps(merged, ["theme", "size", "inset", "class", "children"]);

  return (
    <button
      class={buttonVariants({
        theme: local.theme,
        size: local.size,
        inset: local.inset,
        class: local.class,
      })}
      {...rest}
    >
      {local.children}
    </button>
  );
}
