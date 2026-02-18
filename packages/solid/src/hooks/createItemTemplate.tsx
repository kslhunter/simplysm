import type { JSX } from "solid-js";

/**
 * WeakMap 기반 템플릿 슬롯 패턴을 생성합니다. SolidJS children을 통해 렌더 함수를 전달할 때 사용합니다.
 *
 * Select와 Combobox의 ItemTemplate 서브 컴포넌트 패턴에서 사용됩니다.
 * TemplateSlot은 WeakMap에 렌더 함수를 ref로 저장하는 숨겨진 span을 렌더링합니다.
 * getTemplate은 resolved 슬롯 엘리먼트에서 렌더 함수를 가져옵니다.
 *
 * @param dataAttr - 숨겨진 span에 사용할 HTML 속성 이름 (예: "data-select-item-template")
 */
export function createItemTemplate<TArgs extends unknown[]>(
  dataAttr: string,
): {
  TemplateSlot: (props: { children: (...args: TArgs) => JSX.Element }) => JSX.Element;
  getTemplate: (slotElements: Element[]) => ((...args: TArgs) => JSX.Element) | undefined;
} {
  const templateFnMap = new WeakMap<HTMLElement, (...args: TArgs) => JSX.Element>();

  function TemplateSlot(props: { children: (...args: TArgs) => JSX.Element }): JSX.Element {
    return (
      <span
        ref={(el) => {
          templateFnMap.set(el, props.children);
        }}
        {...{ [dataAttr]: true }}
        style={{ display: "none" }}
      />
    );
  }

  function getTemplate(slotElements: Element[]): ((...args: TArgs) => JSX.Element) | undefined {
    if (slotElements.length === 0) return undefined;
    const el = slotElements[0];
    if (el instanceof HTMLElement) {
      return templateFnMap.get(el);
    }
    return undefined;
  }

  return { TemplateSlot, getTemplate };
}
