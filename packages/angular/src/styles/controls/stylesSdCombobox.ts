import {SdStyleProvider} from "../../provider/SdStyleProvider";

export const stylesSdCombobox = (vars: SdStyleProvider) => /* language=LESS */ `
  sd-combobox {
    display: block;
    overflow: visible;
    position: relative;
  
    > ._icon {
      position: absolute;
      top: 1px;
      right: 1px;
      padding: ${vars.gap.sm} 0;
      width: 30px;
      text-align: center;
      pointer-events: none;
    }
  
    > sd-textfield > input {
      padding-right: 30px !important;
    }
  }
  
  ._sd-combobox-dropdown {
    position: fixed;
    z-index: ${vars.zIndex.dropdown};
    opacity: 0;
    transform: translateY(-10px);
    transition: .1s linear;
    transition-property: transform, opacity;
    pointer-events: none;
    background: white;
    //border: 1px solid ${vars.transColor.dark};
    ${vars.elevation(6)};
    //border-radius: 2px;
    min-width: 120px;
  
    &:focus {
      outline: 1px solid ${vars.themeColor.primary.default};
    }
  }`;
