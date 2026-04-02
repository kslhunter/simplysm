import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdBarcodeCode128Test,
  SdBarcodeQrcodeTest,
  SdBarcodeChangeTest,
  SdBarcodeNoValueTest,
} from "./sd-barcode-test.fixture";
import {
  SdEchartsDefaultTest,
  SdEchartsChangeTest,
} from "./sd-echarts-test.fixture";
import * as echarts from "echarts";

describe("Feature 2.7 Slice 1: sd-barcode", () => {
  it("type=code128, value=12345이면 SVG 바코드가 렌더링된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdBarcodeCode128Test] })
      .createComponent(SdBarcodeCode128Test);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-barcode") as HTMLElement;
    expect(host.querySelector("svg")).not.toBeNull();
  });

  it("type=qrcode이면 QR 코드 SVG가 렌더링된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdBarcodeQrcodeTest] })
      .createComponent(SdBarcodeQrcodeTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-barcode") as HTMLElement;
    expect(host.querySelector("svg")).not.toBeNull();
  });

  it("value가 변경되면 바코드 SVG가 갱신된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdBarcodeChangeTest] })
      .createComponent(SdBarcodeChangeTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-barcode") as HTMLElement;
    const svg1 = host.querySelector("div")!.innerHTML;

    fixture.componentInstance.value.set("67890");
    fixture.detectChanges();
    await fixture.whenStable();

    const svg2 = host.querySelector("div")!.innerHTML;
    expect(svg2).not.toBe("");
    expect(svg2).not.toBe(svg1);
  });

  it("value 미지정 시 아무것도 렌더링되지 않는다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdBarcodeNoValueTest] })
      .createComponent(SdBarcodeNoValueTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-barcode") as HTMLElement;
    const div = host.querySelector("div") as HTMLElement;
    expect(div.innerHTML).toBe("");
  });

  it("type=ean13으로도 바코드가 렌더링된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdBarcodeChangeTest] })
      .createComponent(SdBarcodeChangeTest);
    fixture.componentInstance.type.set("ean13");
    fixture.componentInstance.value.set("5901234123457");
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-barcode") as HTMLElement;
    expect(host.querySelector("svg")).not.toBeNull();
  });
});

describe("Feature 2.7 Slice 2: sd-echarts", () => {
  it("option을 전달하면 SVG 차트가 렌더링된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdEchartsDefaultTest] })
      .createComponent(SdEchartsDefaultTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-echarts") as HTMLElement;
    expect(host.querySelector("svg")).not.toBeNull();
  });

  it("option이 변경되면 차트가 갱신된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdEchartsChangeTest] })
      .createComponent(SdEchartsChangeTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-echarts") as HTMLElement;
    const svgBefore = host.querySelector("svg")?.innerHTML ?? "";

    fixture.componentInstance.option.set({
      xAxis: { type: "category", data: ["X", "Y"] },
      yAxis: { type: "value" },
      series: [{ data: [10, 20], type: "line" }],
    });
    fixture.detectChanges();
    await fixture.whenStable();

    const svgAfter = host.querySelector("svg")?.innerHTML ?? "";
    expect(svgAfter).not.toBe(svgBefore);
  });

  it("echarts showLoading/hideLoading이 동작한다", () => {
    const div = document.createElement("div");
    div.style.width = "400px";
    div.style.height = "300px";
    document.body.appendChild(div);

    const chart = echarts.init(div, null, { renderer: "svg" });
    chart.setOption({
      xAxis: { type: "category", data: ["A"] },
      yAxis: { type: "value" },
      series: [{ data: [1], type: "bar" }],
    });

    chart.showLoading();
    chart.getZr().refreshImmediately();
    const svg = div.querySelector("svg") as SVGElement;
    expect(svg.textContent).toContain("loading");

    chart.hideLoading();
    chart.getZr().refreshImmediately();
    expect(svg.textContent).not.toContain("loading");

    chart.dispose();
    document.body.removeChild(div);
  });

  it("sdResize 이벤트 시 에러 없이 차트가 리사이즈된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdEchartsDefaultTest] })
      .createComponent(SdEchartsDefaultTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-echarts") as HTMLElement;
    expect(host.querySelector("svg")).not.toBeNull();

    host.dispatchEvent(new Event("sdResize"));
    fixture.detectChanges();

    expect(host.querySelector("svg")).not.toBeNull();
  });
});
