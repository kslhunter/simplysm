import { type Component, createEffect, onCleanup, splitProps, type JSX } from "solid-js";
import { createResizeObserver } from "@solid-primitives/resize-observer";
import * as echarts from "echarts";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export interface EchartsProps extends JSX.HTMLAttributes<HTMLDivElement> {
  option: echarts.EChartsOption;
  loading?: boolean;
}

const baseClass = clsx("block", "size-full");

export const Echarts: Component<EchartsProps> = (props) => {
  const [local, rest] = splitProps(props, ["option", "loading", "class"]);
  let containerRef!: HTMLDivElement;
  let chart: echarts.EChartsType;

  // 마운트 시 차트 초기화 + 언마운트 시 정리
  createEffect(() => {
    chart = echarts.init(containerRef, null, { renderer: "svg" });
    onCleanup(() => chart.dispose());
  });

  // option 변경 감지
  createEffect(() => {
    chart.setOption(local.option);
  });

  // loading 상태 변경 감지
  createEffect(() => {
    if (local.loading) {
      chart.showLoading();
    } else {
      chart.hideLoading();
    }
  });

  // 컨테이너 크기 변경 감지
  createResizeObserver(containerRef, () => {
    chart.resize();
  });

  return (
    <div
      data-echarts
      ref={containerRef}
      class={twMerge(baseClass, local.class)}
      {...rest}
    />
  );
};
