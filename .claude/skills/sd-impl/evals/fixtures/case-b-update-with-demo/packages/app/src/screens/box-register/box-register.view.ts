import { Component, signal } from "@angular/core";

@Component({
  selector: "app-box-register",
  template: `
    <div class="box-register">
      <h2>박스 등록</h2>
      <div class="form">
        <label>
          박스 코드
          <input
            type="text"
            [value]="boxCode()"
            (input)="onBoxCodeInput($event)"
          />
        </label>
        <label>
          품목 코드
          <input
            type="text"
            [value]="itemCode()"
            (input)="onItemCodeInput($event)"
          />
        </label>
      </div>
      <button (click)="onSave()">저장</button>
    </div>
  `,
})
export class BoxRegisterView {
  boxCode = signal("");
  itemCode = signal("");

  onBoxCodeInput(e: Event) {
    this.boxCode.set((e.target as HTMLInputElement).value);
  }

  onItemCodeInput(e: Event) {
    this.itemCode.set((e.target as HTMLInputElement).value);
  }

  onSave() {
    // 데모 골격: 실제 저장 동작 없음 (sd-impl 풀 구현 대기)
    console.log("박스 등록 데모", { box: this.boxCode(), item: this.itemCode() });
  }
}
