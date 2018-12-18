import {SdStyleProvider} from "../../provider/SdStyleProvider";

export const stylesSdTabItem = (vars: SdStyleProvider) => /* language=LESS */ `
  sd-tab-item {
    display: inline-block;
    padding: ${vars.gap.sm} ${vars.gap.default};
    cursor: pointer;

    &:hover {
      background: rgba(0, 0, 0, .05);
    }

    &[sd-selected=true] {
      background: ${vars.themeColor.primary.default};
      color: ${vars.textReverseColor.default};
    }
  }`;