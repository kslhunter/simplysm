import {SdStyleProvider} from "../../provider/SdStyleProvider";

export const stylesSdLabel = (vars: SdStyleProvider) => /* language=LESS */ `
  sd-label {
    display: inline-block;
    background: ${vars.themeColor.grey.darkest};
    color: ${vars.textReverseColor.default};
    padding: 0 ${vars.gap.xs};
    border-radius: 2px;
    text-indent: 0;` +

  Object.keys(vars.themeColor).map(key => `
    &[sd-theme='${key}'] {
      background:${vars.themeColor[key].default};
    }`
  ).join("\n") + `

    &[sd-clickable=true] {
      cursor: pointer;

      &:hover {
        background: ${vars.themeColor.grey.dark};` +

  Object.keys(vars.themeColor).map(key => `
        &[sd-theme='${key}'] {
          background:${vars.themeColor[key].dark};
        }`
  ).join("\n") + `
      }
    }
  }`;