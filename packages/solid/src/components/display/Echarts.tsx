import {
  type Component,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  splitProps,
  type JSX,
} from "solid-js";
import { createResizeObserver } from "@solid-primitives/resize-observer";
import * as echarts from "echarts";
import { twMerge } from "tailwind-merge";

export interface EchartsProps extends JSX.HTMLAttributes<HTMLDivElement> {
  option: echarts.EChartsOption;
  busy?: boolean;
}

export const Echarts: Component<EchartsProps> = (props) => {
  const [local, rest] = splitProps(props, ["option", "busy", "class"]);
  let containerRef!: HTMLDivElement;
  let chart: echarts.EChartsType | undefined;
  const [ready, setReady] = createSignal(false);

  // Initialize chart on mount
  onMount(() => {
    chart = echarts.init(containerRef, null, { renderer: "svg" });
    setReady(true);
  });

  onCleanup(() => chart?.dispose());

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

  return <div data-echarts ref={containerRef} class={twMerge("block size-full", local.class)} {...rest} />;
};
