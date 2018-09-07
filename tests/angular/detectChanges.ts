import {ComponentFixture} from "@angular/core/testing/src/component_fixture";

export function detectChanges(fixture: ComponentFixture<any>): void {
  fixture.changeDetectorRef["_view"].nodes[0].componentView.state |= (1 << 3);
  fixture.detectChanges();
}