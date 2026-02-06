import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export interface FormTableProps extends JSX.HTMLAttributes<HTMLTableElement> {}

const baseClass = clsx(
  "border-separate border-spacing-0 border-0",
  // 모든 셀: 수직 중앙, 오른쪽/아래 패딩
  "[&_td]:align-middle [&_th]:align-middle",
  "[&_td]:pr-1.5 [&_th]:pr-1.5",
  "[&_td]:pb-1 [&_th]:pb-1",
  // 행의 마지막 셀: 오른쪽 패딩 제거
  "[&_tr>*:last-child]:pr-0",
  // 마지막 행 셀: 아래 패딩 제거
  "[&_tr:last-child>*]:pb-0",
  // th: 오른쪽 정렬, 콘텐츠 너비, 줄바꿈 방지
  "[&_th]:w-0 [&_th]:whitespace-nowrap [&_th]:pl-1 [&_th]:text-right",
);

export const FormTable: ParentComponent<FormTableProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class"]);

  return (
    <table class={twMerge(baseClass, local.class)} {...rest}>
      {local.children}
    </table>
  );
};
