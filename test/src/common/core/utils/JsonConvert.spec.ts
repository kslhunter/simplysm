import { expect } from "chai";
import { DateOnly, DateTime, JsonConvert, SdError, Time, Uuid } from "@simplysm/sd-core-common";

describe("(common) core.utils.JsonConvert", () => {
  it("객체 와 JSON 문자열 사이를 서로 변환할 수 있다.", () => {
    const obj = { a: 1 };
    const json = JsonConvert.stringify(obj);
    expect(json).to.deep.equal(`{"a":1}`);

    const newObj = JsonConvert.parse(json);
    expect(newObj).to.deep.equal(obj);
  });

  it("Date, DateTime, DateOnly, Time, Uuid, Buffer, Error 가 있어도 정상 동작한다.", () => {
    const obj = {
      date: new Date(2000, 0, 2, 3, 4, 5, 6),
      dt: new DateTime(),
      d: new DateOnly(),
      t: new Time(),
      uuid: Uuid.new(),
      b: Buffer.from([0x01, 0x02, 0x03]),
      err: new SdError("test")
    };
    const json = JsonConvert.stringify(obj);
    expect(json).to.includes(`"date":{"__type__":"Date","data":`);
    expect(json).to.includes(`"dt":{"__type__":"DateTime","data":`);
    expect(json).to.includes(`"d":{"__type__":"DateOnly","data":`);
    expect(json).to.includes(`"t":{"__type__":"Time","data":`);
    expect(json).to.includes(`"uuid":{"__type__":"Uuid","data":`);
    expect(json).to.includes(`"b":{"type":"Buffer","data":`);
    expect(json).to.includes(`"err":{"__type__":"Error","data":`);

    const newObj = JsonConvert.parse(json);
    expect(newObj.date).to.instanceOf(Date);
    expect(newObj.dt).to.instanceOf(DateTime);
    expect(newObj.d).to.instanceOf(DateOnly);
    expect(newObj.t).to.instanceOf(Time);
    expect(newObj.uuid).to.instanceOf(Uuid);
    expect(newObj.b).to.instanceOf(Buffer);
    expect(newObj.err).to.instanceOf(Error);

    expect(newObj.date).to.deep.equal(obj.date);
    expect(newObj.dt).to.deep.equal(obj.dt);
    expect(newObj.d).to.deep.equal(obj.d);
    expect(newObj.t).to.deep.equal(obj.t);
    expect(newObj.uuid).to.deep.equal(obj.uuid);
    expect(newObj.b).to.deep.equal(obj.b);
    expect(newObj.err.name).to.equal(obj.err.name);
    expect(newObj.err.stack).to.equal(obj.err.stack);
    expect(newObj.err.message).to.equal(obj.err.message);
  });

  it("문자열로 변환시, replacer 옵션을 통해 변환 방식을 변경할 수 있다. 이 경우, replacer 가 먼저 동작한 후, 그 결과값을 바탕으로 JSON 의 기본 파싱이 이루어 진다.", () => {
    const obj = {
      a: new DateTime(),
      b: 2
    };
    const json = JsonConvert.stringify(obj, {
      replacer: (key, item) => (
        item instanceof DateTime ? "!!!" : item
      )
    });
    expect(json).to.equal(`{"a":"!!!","b":2}`);
  });

  it("문자열로 변환시, space 옵션을 통해, 정렬방식을 설정할 수 있다. 이는 indent를 의미하며, 숫자를 입력하면, 해당 숫자만큼 띄어쓰기, 문자를 입력하면 해당 문자를 기준으로 indent하여 정렬한다.", () => {
    const obj = {
      a: "!!!",
      b: 2
    };
    const json = JsonConvert.stringify(obj, { space: 2 });
    expect(json).to.equal(`{\n  "a": "!!!",\n  "b": 2\n}`);
  });

  it("문자열로 변환시, hideBuffer 옵션을 통해, Buffer로 되어있는 값을 숨길 수 있다. 이 경우 해당 키의 값이 \"__hidden__\" 인것 처럼 반환되며, 실제 데이터와 상이 하므로, 로깅등의 용도로 사용하는 것이 좋다.", () => {
    const obj = {
      a: Buffer.from([0x01, 0x02, 0x03]),
      b: 2
    };

    const json = JsonConvert.stringify(obj, { hideBuffer: true });
    expect(json).to.equal(`{"a":{"type":"Buffer","data":"__hidden__"},"b":2}`);
  });
});