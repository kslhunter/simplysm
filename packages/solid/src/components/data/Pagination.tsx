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

type PaginationSize = "sm" | "lg";

export interface PaginationProps extends JSX.HTMLAttributes<HTMLElement> {
  pageIndex: number;
  onPageIndexChange?: (pageIndex: number) => void;
  totalPageCount: number;
  displayPageCount?: number;
  size?: PaginationSize;
}

const baseClass = clsx("inline-flex items-center");

const btnClass = clsx("border-none font-normal");

const gapClasses: Record<PaginationSize | "default", string> = {
  default: "gap-1",
  sm: "gap-0.5",
  lg: "gap-1.5",
};

export const Pagination: Component<PaginationProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "class",
    "pageIndex",
    "onPageIndexChange",
    "totalPageCount",
    "displayPageCount",
    "size",
  ]);

  const visibleCount = () => local.displayPageCount ?? 10;

  const pages = () => {
    const from = Math.floor(local.pageIndex / visibleCount()) * visibleCount();
    const to = Math.min(from + visibleCount(), local.totalPageCount);
    const result: number[] = [];
    for (let i = from; i < to; i++) {
      result.push(i);
    }
    return result;
  };

  const hasPrev = () => (pages()[0] ?? 0) > 0;
  const hasNext = () => (pages()[pages().length - 1] ?? 0) < local.totalPageCount - 1;

  const getClassName = () => twMerge(baseClass, gapClasses[local.size ?? "default"], local.class);

  return (
    <nav {...rest} data-pagination class={getClassName()}>
      <Button
        class={btnClass}
        theme="base"
        variant="ghost"
        size={local.size}
        disabled={!hasPrev()}
        onClick={() => local.onPageIndexChange?.(0)}
      >
        <Icon icon={IconChevronsLeft} size="1em" />
      </Button>
      <Button
        class={btnClass}
        theme="base"
        variant="ghost"
        size={local.size}
        disabled={!hasPrev()}
        onClick={() => local.onPageIndexChange?.((pages()[0] ?? 1) - 1)}
      >
        <Icon icon={IconChevronLeft} size="1em" />
      </Button>
      <For each={pages()}>
        {(p) => (
          <Button
            class={btnClass}
            theme={p === local.pageIndex ? "primary" : "base"}
            variant={p === local.pageIndex ? "solid" : "ghost"}
            size={local.size}
            onClick={() => local.onPageIndexChange?.(p)}
          >
            {p + 1}
          </Button>
        )}
      </For>
      <Button
        class={btnClass}
        theme="base"
        variant="ghost"
        size={local.size}
        disabled={!hasNext()}
        onClick={() => local.onPageIndexChange?.((pages()[pages().length - 1] ?? 0) + 1)}
      >
        <Icon icon={IconChevronRight} size="1em" />
      </Button>
      <Button
        class={btnClass}
        theme="base"
        variant="ghost"
        size={local.size}
        disabled={!hasNext()}
        onClick={() => local.onPageIndexChange?.(local.totalPageCount - 1)}
      >
        <Icon icon={IconChevronsRight} size="1em" />
      </Button>
    </nav>
  );
};
