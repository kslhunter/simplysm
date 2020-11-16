import { INotifyPropertyChange, NotifyPropertyChange } from "@simplysm/sd-core-common";
import * as sinon from "sinon";

describe("(common) core.decorators.NotifyPropertyChange", () => {
  it("Object 의 Property 값이 변경되었을 경우, Event 가 발생하며, 변경 이전의 값과, 변경 전/후의 값을 가져올 수 있다.", () => {
    const spy = sinon.spy((propertyName, oldValue, newValue) => {
    });

    class TestClass implements INotifyPropertyChange {
      @NotifyPropertyChange()
      public testProp?: string;

      public onPropertyChange<K extends keyof this>(propertyName: K, oldValue: this[K], newValue: this[K]): void {
        spy(propertyName, oldValue, newValue);
      }
    }

    const testObject = new TestClass();
    sinon.assert.notCalled(spy);
    testObject.testProp = "1234";
    sinon.assert.calledWith(spy, "testProp", undefined, "1234");
  });
});
