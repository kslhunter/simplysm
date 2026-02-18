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

  // 마운트 시 echarts 동적 로드 + 차트 초기화
  createEffect(() => {
    void import("echarts").then((echarts) => {
      chart = echarts.init(containerRef, null, { renderer: "svg" });
      setReady(true);
    });

    onCleanup(() => chart?.dispose());
  });

  // option 변경 감지
  createEffect(() => {
    if (!ready()) return;
    chart!.setOption(local.option);
  });

  // busy 상태 변경 감지
  createEffect(() => {
    if (!ready()) return;
    if (local.busy) {
      chart!.showLoading();
    } else {
      chart!.hideLoading();
    }
  });

  // 컨테이너 크기 변경 감지
  createResizeObserver(containerRef, () => {
    chart?.resize();
  });

  return <div data-echarts ref={containerRef} class={twMerge(baseClass, local.class)} {...rest} />;
};
