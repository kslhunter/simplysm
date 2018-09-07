import {afterEach, beforeEach, describe} from "mocha";
import {ComponentFixture, getTestBed, TestBed} from "@angular/core/testing";
import {SdDomValidatorProvider, SdTextfieldControl} from "@simplism/angular";
import * as assert from "assert";
import {CommonModule} from "@angular/common";
import {By} from "@angular/platform-browser";
import {detectChanges} from "../detectChanges";

describe("provider.SdDomValidatorProvider", () => {
  let textfieldFixture: ComponentFixture<SdTextfieldControl>;
  let provider: SdDomValidatorProvider;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule
      ],
      declarations: [
        SdTextfieldControl
      ],
      providers: [
        SdDomValidatorProvider
      ]
    }).compileComponents();

    textfieldFixture = TestBed.createComponent(SdTextfieldControl);
    provider = TestBed.get(SdDomValidatorProvider);
  });


  afterEach(() => {
    getTestBed().resetTestingModule();
  });

  it("validate", () => {
    textfieldFixture.componentInstance.required = true;
    detectChanges(textfieldFixture);

    try {
      provider.validate(textfieldFixture.nativeElement);
    }
    catch (err) {
      assert.strictEqual(document.activeElement, textfieldFixture.debugElement.query(By.css("input")).nativeElement);
      return;
    }

    assert.fail("에러가 발생했어야 함.");
  });
});