import { type Component, createEffect, splitProps, type JSX } from "solid-js";
import { twMerge } from "tailwind-merge";
import bwipjs from "bwip-js/browser";
import type { BarcodeType } from "./Barcode.types";

export interface BarcodeProps extends JSX.HTMLAttributes<HTMLDivElement> {
  type: BarcodeType;
  value?: string;
}

export const Barcode: Component<BarcodeProps> = (props) => {
  const [local, rest] = splitProps(props, ["type", "value", "class"]);
  let containerRef!: HTMLDivElement;

  createEffect(() => {
    const value = local.value;
    if (value == null || value === "") {
      containerRef.innerHTML = "";
      return;
    }

    try {
      const svg = bwipjs.toSVG({
        bcid: local.type,
        text: value,
      });
      containerRef.innerHTML = svg;

      const svgEl = containerRef.querySelector("svg");
      if (svgEl) {
        const viewBox = svgEl.getAttribute("viewBox");
        if (viewBox != null) {
          const parts = viewBox.split(" ");
          svgEl.setAttribute("width", parts[2]);
          svgEl.setAttribute("height", parts[3]);
        }
      }
    } catch (err) {
      console.warn("Barcode render failed:", err);
      containerRef.innerHTML = "";
    }
  });

  return <div data-barcode ref={containerRef} class={twMerge("inline-block", local.class)} {...rest} />;
};
