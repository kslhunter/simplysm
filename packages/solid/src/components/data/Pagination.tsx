import { type Component, For, type JSX, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from "@tabler/icons-solidjs";
import { Button } from "../form-control/Button";
import { Icon } from "../display/Icon";
import { type ComponentSize, gap } from "../../styles/control.styles";

export interface PaginationProps extends JSX.HTMLAttributes<HTMLElement> {
  page: number;
  onPageChange?: (page: number) => void;
  totalPageCount: number;
  displayPageCount?: number;
  size?: ComponentSize;
}

const baseClass = clsx("inline-flex items-center");

const btnClass = clsx("border-none font-normal");

const gapClasses: Record<ComponentSize, string> = {
  default: gap.default,
  xs: gap.xs,
  sm: gap.sm,
  lg: gap.lg,
  xl: gap.xl,
};

export const Pagination: Component<PaginationProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "class",
    "page",
    "onPageChange",
    "totalPageCount",
    "displayPageCount",
    "size",
  ]);

  const visibleCount = () => local.displayPageCount ?? 10;

  const pages = () => {
    const from = Math.floor((local.page - 1) / visibleCount()) * visibleCount() + 1;
    const to = Math.min(from + visibleCount() - 1, local.totalPageCount);
    const result: number[] = [];
    for (let i = from; i <= to; i++) {
      result.push(i);
    }
    return result;
  };

  const hasPrev = () => (pages()[0] ?? 1) > 1;
  const hasNext = () => (pages()[pages().length - 1] ?? 1) < local.totalPageCount;

  const getClassName = () => twMerge(baseClass, gapClasses[local.size ?? "default"], local.class);

  return (
    <nav {...rest} data-pagination class={getClassName()}>
      <Button
        class={btnClass}
        theme="base"
        variant="ghost"
        size={local.size}
        disabled={!hasPrev()}
        onClick={() => local.onPageChange?.(1)}
      >
        <Icon icon={IconChevronsLeft} size="1em" />
      </Button>
      <Button
        class={btnClass}
        theme="base"
        variant="ghost"
        size={local.size}
        disabled={!hasPrev()}
        onClick={() => local.onPageChange?.((pages()[0] ?? 2) - 1)}
      >
        <Icon icon={IconChevronLeft} size="1em" />
      </Button>
      <For each={pages()}>
        {(p) => (
          <Button
            class={btnClass}
            theme={p === local.page ? "primary" : "base"}
            variant={p === local.page ? "solid" : "ghost"}
            size={local.size}
            onClick={() => local.onPageChange?.(p)}
          >
            {p}
          </Button>
        )}
      </For>
      <Button
        class={btnClass}
        theme="base"
        variant="ghost"
        size={local.size}
        disabled={!hasNext()}
        onClick={() => local.onPageChange?.((pages()[pages().length - 1] ?? 0) + 1)}
      >
        <Icon icon={IconChevronRight} size="1em" />
      </Button>
      <Button
        class={btnClass}
        theme="base"
        variant="ghost"
        size={local.size}
        disabled={!hasNext()}
        onClick={() => local.onPageChange?.(local.totalPageCount)}
      >
        <Icon icon={IconChevronsRight} size="1em" />
      </Button>
    </nav>
  );
};
