import {SdStyleProvider} from "../../provider/SdStyleProvider";

export const stylesSdComboboxItem = (vars: SdStyleProvider) => /* language=LESS */ `
  sd-combobox-item {
    display: block;
    // padding: ${vars.gap.xs} ${vars.gap.lg} ${vars.gap.xs} ${vars.gap.sm};
    padding: ${vars.gap.sm} ${vars.gap.default};
    cursor: pointer;
    // font-size: ${vars.fontSize.sm};
  
    &:hover {
      background: rgba(0, 0, 0, .1);
    }
  }`;