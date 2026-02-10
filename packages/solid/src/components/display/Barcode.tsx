import { type Component, createEffect, splitProps, type JSX } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import bwipjs from "bwip-js/browser";

export type BarcodeType =
  | "auspost"
  | "azteccode"
  | "azteccodecompact"
  | "aztecrune"
  | "bc412"
  | "channelcode"
  | "codablockf"
  | "code11"
  | "code128"
  | "code16k"
  | "code2of5"
  | "code32"
  | "code39"
  | "code39ext"
  | "code49"
  | "code93"
  | "code93ext"
  | "codeone"
  | "coop2of5"
  | "daft"
  | "databarexpanded"
  | "databarexpandedcomposite"
  | "databarexpandedstacked"
  | "databarexpandedstackedcomposite"
  | "databarlimited"
  | "databarlimitedcomposite"
  | "databaromni"
  | "databaromnicomposite"
  | "databarstacked"
  | "databarstackedcomposite"
  | "databarstackedomni"
  | "databarstackedomnicomposite"
  | "databartruncated"
  | "databartruncatedcomposite"
  | "datalogic2of5"
  | "datamatrix"
  | "datamatrixrectangular"
  | "datamatrixrectangularextension"
  | "dotcode"
  | "ean13"
  | "ean13composite"
  | "ean14"
  | "ean2"
  | "ean5"
  | "ean8"
  | "ean8composite"
  | "flattermarken"
  | "gs1-128"
  | "gs1-128composite"
  | "gs1-cc"
  | "gs1datamatrix"
  | "gs1datamatrixrectangular"
  | "gs1dldatamatrix"
  | "gs1dlqrcode"
  | "gs1dotcode"
  | "gs1northamericancoupon"
  | "gs1qrcode"
  | "hanxin"
  | "hibcazteccode"
  | "hibccodablockf"
  | "hibccode128"
  | "hibccode39"
  | "hibcdatamatrix"
  | "hibcdatamatrixrectangular"
  | "hibcmicropdf417"
  | "hibcpdf417"
  | "hibcqrcode"
  | "iata2of5"
  | "identcode"
  | "industrial2of5"
  | "interleaved2of5"
  | "isbn"
  | "ismn"
  | "issn"
  | "itf14"
  | "japanpost"
  | "kix"
  | "leitcode"
  | "mailmark"
  | "mands"
  | "matrix2of5"
  | "maxicode"
  | "micropdf417"
  | "microqrcode"
  | "msi"
  | "onecode"
  | "pdf417"
  | "pdf417compact"
  | "pharmacode"
  | "pharmacode2"
  | "planet"
  | "plessey"
  | "posicode"
  | "postnet"
  | "pzn"
  | "qrcode"
  | "rationalizedCodabar"
  | "raw"
  | "rectangularmicroqrcode"
  | "royalmail"
  | "sscc18"
  | "swissqrcode"
  | "symbol"
  | "telepen"
  | "telepennumeric"
  | "ultracode"
  | "upca"
  | "upcacomposite"
  | "upce"
  | "upcecomposite";

export interface BarcodeProps extends JSX.HTMLAttributes<HTMLDivElement> {
  type: BarcodeType;
  value?: string;
}

const baseClass = clsx("inline-block");

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
    } catch {
      containerRef.innerHTML = "";
    }
  });

  return <div data-barcode ref={containerRef} class={twMerge(baseClass, local.class)} {...rest} />;
};
