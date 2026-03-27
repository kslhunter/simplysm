import { Component, DebugElement, signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideZonelessChangeDetection } from "@angular/core";
import { SdDropdownControl } from "../src/ui/overlay/dropdown/sd-dropdown.control";
import { SdDropdownPopupControl } from "../src/ui/overlay/dropdown/sd-dropdown-popup.control";
import { By } from "@angular/platform-browser";

@Component({
  standalone: true,
  imports: [SdDropdownControl, SdDropdownPopupControl],
  template: `
    @if (show()) {
      <sd-dropdown>
        <button type="button">trigger</button>
        <sd-dropdown-popup>
          <button type="button" id="popup-btn">popup item</button>
        </sd-dropdown-popup>
      </sd-dropdown>
    }
  `,
})
class TestHostComponent {
  show = signal(true);
}

function getDropdownControl(fixture: ComponentFixture<TestHostComponent>): SdDropdownControl {
  const de: DebugElement = fixture.debugElement.query(By.directive(SdDropdownControl));
  return de.componentInstance as SdDropdownControl;
}

async function setupFixture(): Promise<{
  fixture: ComponentFixture<TestHostComponent>;
  component: TestHostComponent;
}> {
  await TestBed.configureTestingModule({
    imports: [TestHostComponent],
    providers: [provideZonelessChangeDetection()],
  }).compileComponents();

  const fixture = TestBed.createComponent(TestHostComponent);
  const component = fixture.componentInstance;
  await fixture.whenStable();
  fixture.detectChanges();
  await fixture.whenStable();

  return { fixture, component };
}

describe("SdDropdownControl", () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe("destroy 시 popup 정리", () => {
    it("open=true 상태에서 destroy되면 popup이 document.body에서 제거된다", async () => {
      // Given: dropdown이 open 상태
      const { fixture, component } = await setupFixture();

      const dropdownCtrl = getDropdownControl(fixture);
      dropdownCtrl.open.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(document.body.querySelector("sd-dropdown-popup")).not.toBeNull();

      // When: @if 조건이 false가 되어 컴포넌트가 destroy됨
      component.show.set(false);
      fixture.detectChanges();
      await fixture.whenStable();

      // Then: document.body에 sd-dropdown-popup이 없다
      expect(document.body.querySelector("sd-dropdown-popup")).toBeNull();
    });
  });

  describe("정상 close 경로", () => {
    it("open=false로 변경 시 popup이 document.body에서 제거된다", async () => {
      // Given: dropdown이 open 상태
      const { fixture } = await setupFixture();

      const dropdownCtrl = getDropdownControl(fixture);
      dropdownCtrl.open.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(document.body.querySelector("sd-dropdown-popup")).not.toBeNull();

      // When: open이 false로 변경
      dropdownCtrl.open.set(false);
      fixture.detectChanges();
      await fixture.whenStable();

      // Then: popup이 document.body에서 제거된다
      expect(document.body.querySelector("sd-dropdown-popup")).toBeNull();
    });

    it("popup에 focus가 있을 때 close 시 focus가 host 요소로 복귀한다", async () => {
      // Given: dropdown이 open 상태
      const { fixture } = await setupFixture();

      const dropdownCtrl = getDropdownControl(fixture);
      dropdownCtrl.open.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      const popupBtn = document.body.querySelector<HTMLButtonElement>("#popup-btn");
      expect(popupBtn).not.toBeNull();

      // And: popup 내부 요소에 focus
      popupBtn!.focus();
      expect(document.activeElement).toBe(popupBtn);

      // When: open이 false로 변경
      dropdownCtrl.open.set(false);
      fixture.detectChanges();
      await fixture.whenStable();

      // Then: focus가 SdDropdownControl host 요소(sd-dropdown)로 복귀한다
      const sdDropdown = fixture.nativeElement.querySelector("sd-dropdown");
      expect(document.activeElement).toBe(sdDropdown);
    });
  });
});
