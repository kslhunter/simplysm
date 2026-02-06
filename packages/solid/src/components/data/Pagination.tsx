import { type Component, type JSX, splitProps } from "solid-js";
import { For } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight } from "@tabler/icons-solidjs";
import { Button } from "../form-control/Button";
import { Icon } from "../display/Icon";

type PaginationSize = "sm" | "lg";

export interface PaginationProps extends JSX.HTMLAttributes<HTMLElement> {
  page: number;
  onPageChange?: (page: number) => void;
  totalPages: number;
  displayPages?: number;
  size?: PaginationSize;
}

const baseClass = clsx("inline-flex items-center");

const gapClasses: Record<PaginationSize | "default", string> = {
  default: "gap-1",
  sm: "gap-0.5",
  lg: "gap-1.5",
};

export const Pagination: Component<PaginationProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "class",
    "page",
    "onPageChange",
    "totalPages",
    "displayPages",
    "size",
  ]);

  const visibleCount = () => local.displayPages ?? 10;

  const pages = () => {
    const from = Math.floor(local.page / visibleCount()) * visibleCount();
    const to = Math.min(from + visibleCount(), local.totalPages);
    const result: number[] = [];
    for (let i = from; i < to; i++) {
      result.push(i);
    }
    return result;
  };

  const hasPrev = () => (pages()[0] ?? 0) > 0;
  const hasNext = () => (pages()[pages().length - 1] ?? 0) < local.totalPages - 1;

  const getClassName = () =>
    twMerge(baseClass, gapClasses[local.size ?? "default"], local.class);

  return (
    <nav {...rest} data-pagination class={getClassName()}>
      <Button
        theme="base"
        variant="ghost"
        size={local.size}
        disabled={!hasPrev()}
        onClick={() => local.onPageChange?.(0)}
      >
        <Icon icon={IconChevronsLeft} size="1em" />
      </Button>
      <Button
        theme="base"
        variant="ghost"
        size={local.size}
        disabled={!hasPrev()}
        onClick={() => local.onPageChange?.((pages()[0] ?? 1) - 1)}
      >
        <Icon icon={IconChevronLeft} size="1em" />
      </Button>
      <For each={pages()}>
        {(p) => (
          <Button
            theme="base"
            variant={p === local.page ? "outline" : "ghost"}
            size={local.size}
            onClick={() => local.onPageChange?.(p)}
          >
            {p + 1}
          </Button>
        )}
      </For>
      <Button
        theme="base"
        variant="ghost"
        size={local.size}
        disabled={!hasNext()}
        onClick={() => local.onPageChange?.((pages()[pages().length - 1] ?? 0) + 1)}
      >
        <Icon icon={IconChevronRight} size="1em" />
      </Button>
      <Button
        theme="base"
        variant="ghost"
        size={local.size}
        disabled={!hasNext()}
        onClick={() => local.onPageChange?.(local.totalPages - 1)}
      >
        <Icon icon={IconChevronsRight} size="1em" />
      </Button>
    </nav>
  );
};
