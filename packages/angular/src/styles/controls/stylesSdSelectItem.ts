import {SdStyleProvider} from "../../provider/SdStyleProvider";

export const stylesSdSelectItem = (vars: SdStyleProvider) => /* language=LESS */ `
  sd-select-item {
    display: block;
    // padding: ${vars.gap.xs} ${vars.gap.sm};
    padding: ${vars.gap.sm} ${vars.gap.default};
    cursor: pointer;
    // font-size: font-size(sm);

    &:hover {
      background: ${vars.transColor.default};
    }
  }`;