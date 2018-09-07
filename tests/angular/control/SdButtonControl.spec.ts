import {afterEach, beforeEach, describe} from "mocha";
import {ComponentFixture, getTestBed, TestBed} from "@angular/core/testing";
import {SdButtonControl} from "@simplism/angular";
import * as assert from "assert";
import {CommonModule} from "@angular/common";
import {detectChanges} from "../detectChanges";
import {By} from "@angular/platform-browser";

describe("control.SdButtonControl", () => {
  let fixture: ComponentFixture<SdButtonControl>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule
      ],
      declarations: [
        SdButtonControl
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SdButtonControl);
    detectChanges(fixture);
  });


  afterEach(() => {
    fixture.destroy();
    getTestBed().resetTestingModule();
  });

  it("테마 설정 가능", () => {
    const comp = fixture.componentInstance;

    comp.theme = "primary";
    detectChanges(fixture);
    assert.strictEqual(fixture.debugElement.attributes["sd-theme"], "primary");

    comp.theme = "info";
    detectChanges(fixture);
    assert.strictEqual(fixture.debugElement.attributes["sd-theme"], "info");

    comp.theme = "success";
    detectChanges(fixture);
    assert.strictEqual(fixture.debugElement.attributes["sd-theme"], "success");

    comp.theme = "warning";
    detectChanges(fixture);
    assert.strictEqual(fixture.debugElement.attributes["sd-theme"], "warning");

    comp.theme = "danger";
    detectChanges(fixture);
    assert.strictEqual(fixture.debugElement.attributes["sd-theme"], "danger");

    comp.theme = undefined;
    detectChanges(fixture);
    assert.strictEqual(!!fixture.debugElement.attributes["sd-theme"], false);
  });

  it("사이즈 설정 가능", () => {
    const comp = fixture.componentInstance;

    comp.size = "sm";
    detectChanges(fixture);
    assert.strictEqual(fixture.debugElement.attributes["sd-size"], "sm");

    comp.size = "lg";
    detectChanges(fixture);
    assert.strictEqual(fixture.debugElement.attributes["sd-size"], "lg");

    comp.size = undefined;
    detectChanges(fixture);
    assert.strictEqual(!!fixture.debugElement.attributes["sd-size"], false);
  });

  it("타입 설정 가능", () => {
    const comp = fixture.componentInstance;

    comp.type = "submit";
    detectChanges(fixture);
    assert.strictEqual(fixture.debugElement.query(By.css("button")).nativeElement["type"], "submit");

    comp.type = "button";
    detectChanges(fixture);
    assert.strictEqual(fixture.debugElement.query(By.css("button")).nativeElement["type"], "button");
  });
});