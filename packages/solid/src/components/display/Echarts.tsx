import {
  type Component,
  createEffect,
  createSignal,
  onCleanup,
  splitProps,
  type JSX,
} from "solid-js";
import { createResizeObserver } from "@solid-primitives/resize-observer";
import type * as echartsType from "echarts";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export interface EchartsProps extends JSX.HTMLAttributes<HTMLDivElement> {
  option: echartsType.EChartsOption;
  busy?: boolean;
}

const baseClass = clsx("block", "size-full");

export const Echarts: Component<EchartsProps> = (props) => {
  const [local, rest] = splitProps(props, ["option", "busy", "class"]);
  let containerRef!: HTMLDivElement;
  let chart: echartsType.EChartsType | undefined;
  const [ready, setReady] = createSignal(false);

  // On mount, dynamically load echarts + initialize chart
  createEffect(() => {
    void import("echarts").then((echarts) => {
      chart = echarts.init(containerRef, null, { renderer: "svg" });
      setReady(true);
    });

    onCleanup(() => chart?.dispose());
  });

  // Detect option changes
  createEffect(() => {
    if (!ready()) return;
    chart!.setOption(local.option);
  });

  // Detect busy state changes
  createEffect(() => {
    if (!ready()) return;
    if (local.busy) {
      chart!.showLoading();
    } else {
      chart!.hideLoading();
    }
  });

  // Detect container size changes
  createResizeObserver(containerRef, () => {
    chart?.resize();
  });

  return <div data-echarts ref={containerRef} class={twMerge(baseClass, local.class)} {...rest} />;
};
