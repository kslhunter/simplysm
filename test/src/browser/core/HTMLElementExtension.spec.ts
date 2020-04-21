import {expect} from "chai";
import {ISdMutationEvent, ISdResizeEvent} from "@simplysm/sd-core-browser";

describe("(browser) core.HTMLElementExtension", () => {
  let el: HTMLElement;
  const suite = (title: string, fn: () => void): void => {
    describe(title, () => {
      beforeEach(() => {
        el = document.createElement("div");
        document.body.appendChild(el);
      });

      fn();

      afterEach(() => {
        document.body.removeChild(el);
      });
    });
  };

  suite("getRelativeOffset", () => {
    it("특정 상위 엘리먼트를 기준으로, 현재 엘리먼트의 위치를 추출할 수 있다. (top, left)", () => {
      el.innerHTML = /* language=HTML */ `
        <div id='div1' style="position: relative;">
          <div id='div2' style="position: absolute; top: 10px; left: 20px;">
            <div id='div3' style="position: absolute; top: 20px; left: 30px;">
              <div id='div4' style="position: absolute; top: 40px; left: 50px;"></div>
            </div>
          </div>
        </div>
      `;
      const div1 = el.children[0] as HTMLElement;
      const div2 = div1.children[0] as HTMLElement;
      const div3 = div2.children[0] as HTMLElement;
      const div4 = div3.children[0] as HTMLElement;

      const offset = div4.getRelativeOffset(div2);
      expect(offset).to.deep.equal({top: 60, left: 80});
    });

    it("상위 엘리먼트는 엘리먼트 자체, 셀렉터 문자열을 통해 선택할 수 있다. 문자열 사용시, 일치하는 첫 부모 엘리먼트를 사용한다.", () => {
      el.innerHTML = /* language=HTML */ `
        <div id='div1' style="position: relative;">
          <div id='div2' style="position: absolute; top: 10px; left: 20px;">
            <div id='div3' style="position: absolute; top: 20px; left: 30px;">
              <div id='div4' style="position: absolute; top: 40px; left: 50px;"></div>
            </div>
          </div>
        </div>
      `;
      const div1 = el.children[0] as HTMLElement;
      const div2 = div1.children[0] as HTMLElement;
      const div3 = div2.children[0] as HTMLElement;
      const div4 = div3.children[0] as HTMLElement;

      const offset = div4.getRelativeOffset("#div2");
      expect(offset).to.deep.equal({top: 60, left: 80});
    });
  });

  suite("prependChild", () => {
    it("특정 엘리먼트의 첫 엘리먼트로 현재 엘리먼트를 등록할 수 있다. (appendChild와 삽입 위치만 다름)", () => {
      el.innerHTML = /* language=HTML */ `
        <div id="div1"></div>
      `;
      const el2 = document.createElement("div");
      el2.id = "div2";
      el.prependChild(el2);

      expect(el.children[0]).to.equal(el2);
    });
  });

  suite("findAll", () => {
    it("셀렉터 문자열을 통해 현재 엘리먼트 하위에 있는 엘리먼트를 가져온다.", () => {
      el.innerHTML = /* language=HTML */ `
        <div class="sel1"></div>
        <div class="sel2"></div>
        <div class="sel1"></div>
        <div class="sel1">
          <div class="sel2"></div>
        </div>
        <div class="sel">
          <div class="sel">
            <div class="sel2">
              <div class="sel2"></div>
            </div>
          </div>
        </div>
      `;

      expect(el.findAll(".sel")[0].findAll(".sel2")).to.length(2);
    });

    it("셀렉터가 \">\" 로 시작하는 경우 children 에서 부터 시작할 수 있다.", () => {
      el.innerHTML = /* language=HTML */ `
        <div class="sel1"></div>
        <div class="sel2"></div>
        <div class="sel1"></div>
        <div class="sel1">
          <div class="sel2"></div>
        </div>
        <div class="sel">
          <div class="sel">
            <div class="sel2">
              <div class="sel2"></div>
            </div>
          </div>
        </div>
      `;

      expect(el.findAll("> .sel2")).to.length(1);
    });
  });

  suite("findParent", () => {
    it("셀렉터 문자열로 부모 엘리먼트중 조건에 맞는 첫번째 엘리먼트를 가져올 수 있다.", () => {
      el.innerHTML = /* language=HTML */ `
        <div id='div1'>
          <div id='div2'>
            <div id='div3'>
              <div id='div4'></div>
            </div>
          </div>
        </div>
      `;
      const div1 = el.children[0] as HTMLElement;
      const div2 = div1.children[0] as HTMLElement;
      const div3 = div2.children[0] as HTMLElement;
      const div4 = div3.children[0] as HTMLElement;

      const result = div4.findParent("#div2");
      expect(result).to.equal(div2);
    });

    it("부모중 해당하는 엘리먼트가 없으면 undefined 가 반환된다.", () => {
      el.innerHTML = /* language=HTML */ `
        <div id='div1'>
          <div id='div2'>
            <div id='div3'>
              <div id='div4'></div>
            </div>
          </div>
        </div>
      `;
      const div1 = el.children[0] as HTMLElement;
      const div2 = div1.children[0] as HTMLElement;
      const div3 = div2.children[0] as HTMLElement;
      const div4 = div3.children[0] as HTMLElement;

      const result = div4.findParent("#div");
      expect(result).to.equal(undefined);
    });
  });

  suite("isFocusable", () => {
    it("현재 엘리먼트가 포커싱이 가능한지 여부를 알 수 있다.", () => {
      expect(el.isFocusable()).to.equal(false);

      el.setAttribute("tabindex", "0");
      expect(el.isFocusable()).to.equal(true);
    });
  });

  suite("findFocusableAll", () => {
    it("다계층 하위 엘리먼트중 포커싱 가능한 엘리먼트를 모두 가져올 수 있다. (현재 엘리먼트 제외)", () => {
      el.innerHTML = /* language=HTML */ `
        <div class="sel1"></div>
        <input/></input>
        <div class="sel1"></div>
        <div class="sel1">
          <input/></input>
        </div>
        <div class="sel">
          <div class="sel">
            <input/>
          </div>
        </div>
      `;

      expect(el.findFocusableAll()).to.length(3);
    });
  });

  suite("findFocusableParent", () => {
    it("다계층 상위 엘리먼트중 포커싱이 가능한 엘리먼트 모두 가져오기 (현재 엘리먼트 제외) 순번이 앞에 있는것이 더 가까운 엘리먼트이다.", () => {
      el.innerHTML = /* language=HTML */ `
        <div id='div1' tabindex="0">
          <div id='div2' tabindex="0">
            <div id='div3'>
              <div id='div4'></div>
            </div>
          </div>
        </div>
      `;
      const div1 = el.children[0] as HTMLElement;
      const div2 = div1.children[0] as HTMLElement;
      const div3 = div2.children[0] as HTMLElement;
      const div4 = div3.children[0] as HTMLElement;

      const result = div4.findFocusableParent();
      expect(result).to.equal(div2);
    });
  });

  suite("Resize event listener", () => {
    it("현재 엘리먼트의 높이나 너비가 변경될 경우 이벤트를 받을 수 있다. 이 경우 이벤트 값으로 어떤것이 변경되었는지, 확인할 수 있다.", done => {
      el.style.display = "inline-block";

      const fn = (event: ISdResizeEvent): void => {
        expect(event.prevHeight).to.equal(0);
        expect(event.newHeight).to.equal(0);
        expect(event.prevWidth).to.equal(0);
        expect(event.newWidth).to.equal(10);

        el.removeEventListener("resize", fn);
        done();
      };

      el.addEventListener("resize", fn);

      setTimeout(() => {
        el.style.width = "10px";
      });
    });
  });

  suite("Mutation event listener", () => {
    it("엘리먼트의 내용물이 변경되는 경우, 이벤트를 받을 수 있다.", done => {
      el.style.display = "inline-block";

      const addDiv = document.createElement("div");
      const fn = (event: ISdMutationEvent): void => {
        expect(event.mutations).to.length(1);
        expect(event.mutations[0].addedNodes[0]).to.includes(addDiv);

        el.removeEventListener("mutation", fn);
        done();
      };

      el.addEventListener("mutation", fn);

      el.appendChild(addDiv);
    });
  });
});