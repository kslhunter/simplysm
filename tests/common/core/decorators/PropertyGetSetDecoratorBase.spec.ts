import { PropertyGetSetDecoratorBase } from "@simplysm/sd-core-common";
import * as sinon from "sinon";
import { expect } from "chai";

describe("(common) core.decorators.PropertyGetSetDecoratorBase", () => {
  it("각 Property 의 get 및 before/after set 에 따른 이벤트를 받아 처리하는 Decorator 를 만들수 있다.", () => {
    //-- 준비
    
    const testDecoratorArg = {
      beforeSet: sinon.spy((target, propertyName, oldValue, newValue) => {
      }),
      afterSet: sinon.spy((target, propertyName, oldValue, newValue) => {
      }),
      get: sinon.spy((target, propertyName, value) => {
      })
    };

    const TestPropertyDecorator = (): Function => PropertyGetSetDecoratorBase(testDecoratorArg);

    class TestClass {
      @TestPropertyDecorator()
      public testProp?: string;
    }
    
    //-- 테스트

    // 값 변경 전후 이벤트 발생 테스트
    const testObject = new TestClass();
    testObject.testProp = "1234";
    sinon.assert.calledWith(testDecoratorArg.beforeSet, testObject, "testProp", undefined, "1234");
    sinon.assert.calledWith(testDecoratorArg.afterSet, testObject, "testProp", undefined, "1234");

    // 값을 Get 할때 이벤트 발생 테스트
    const a = testObject.testProp;
    expect(a).to.equal("1234");
    sinon.assert.calledWith(testDecoratorArg.get, testObject, "testProp", "1234");
  });

  it("복수의 Decorator 가 존재할 경우, 각 Decorator 의 set 동작이 모두 수행된다.", () => {
    //-- 준비
    
    const testDecoratorArg = {
      beforeSet: sinon.spy((target, propertyName, oldValue, newValue) => {
      }),
      afterSet: sinon.spy((target, propertyName, oldValue, newValue) => {
      }),
      get: sinon.spy((target, propertyName, value) => {
      })
    };

    const test2DecoratorArg = {
      beforeSet: sinon.spy((target, propertyName, oldValue, newValue) => {
      }),
      afterSet: sinon.spy((target, propertyName, oldValue, newValue) => {
      }),
      get: sinon.spy((target, propertyName, value) => {
      })
    };

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const TestPropertyDecorator = (): Function => PropertyGetSetDecoratorBase(testDecoratorArg);

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const Test2PropertyDecorator = (): Function => PropertyGetSetDecoratorBase(test2DecoratorArg);

    class TestClass {
      @TestPropertyDecorator()
      @Test2PropertyDecorator()
      public testProp?: string;
    }

    //-- 테스트

    const testObject = new TestClass();
    testObject.testProp = "1234";
    sinon.assert.calledWith(testDecoratorArg.beforeSet, testObject, "testProp", undefined, "1234");
    sinon.assert.calledWith(testDecoratorArg.afterSet, testObject, "testProp", undefined, "1234");
    sinon.assert.calledWith(test2DecoratorArg.beforeSet, testObject, "testProp", undefined, "1234");
    sinon.assert.calledWith(test2DecoratorArg.afterSet, testObject, "testProp", undefined, "1234");

    const a = testObject.testProp;
    expect(a).to.equal("1234");
    sinon.assert.calledWith(testDecoratorArg.get, testObject, "testProp", "1234");
    sinon.assert.calledWith(test2DecoratorArg.get, testObject, "testProp", "1234");
  });

  it("beforeSet 에서 함수를 반환하면, set 된 값을 변환하여 저장할 수 있다.", () => {
    //-- 준비
    
    const testDecoratorArg = {
      beforeSet: sinon.spy((target, propertyName, oldValue, newValue: string) => newValue + "a")
    };

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const TestPropertyDecorator = (): Function => PropertyGetSetDecoratorBase(testDecoratorArg);

    class TestClass {
      @TestPropertyDecorator()
      public testProp?: string;
    }

    //-- 테스트

    const testObject = new TestClass();
    testObject.testProp = "1234";
    expect(testObject.testProp).to.equal("1234a");
  });

  it("함수를 반환하는 beforeSet Decorator 가 여럿 있을 경우, 더 먼저(top) 정의된 Decorator 의 beforeSet 을 먼저 수행한다.", () => {
    //-- 준비

    const testDecoratorArg = {
      beforeSet: sinon.spy((target, propertyName, oldValue, newValue: string) => newValue + "a")
    };
    const test2DecoratorArg = {
      beforeSet: sinon.spy((target, propertyName, oldValue, newValue: string) => newValue + "b")
    };

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const TestPropertyDecorator = (): Function => PropertyGetSetDecoratorBase(testDecoratorArg);
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const Test2PropertyDecorator = (): Function => PropertyGetSetDecoratorBase(test2DecoratorArg);

    class TestClass {
      @TestPropertyDecorator()
      @Test2PropertyDecorator()
      public testProp?: string;
    }

    //-- 테스트

    const testObject = new TestClass();
    testObject.testProp = "1234";
    expect(testObject.testProp).to.equal("1234ab");
  });
});
