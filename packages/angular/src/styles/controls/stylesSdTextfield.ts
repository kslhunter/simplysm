import {SdStyleProvider} from "../../provider/SdStyleProvider";

export const stylesSdTextfield = (vars: SdStyleProvider) => /* language=LESS */ `
  sd-textfield {
    display: block;
    position: relative;
  
    > input,
    > textarea {
      ${vars.formControlBase};
  
      background: white;
      border-color: ${vars.transColor.default};
      transition: outline-color .1s linear;
      outline: 1px solid transparent;
      outline-offset: -1px;
  
      &::-webkit-input-placeholder {
        color: ${vars.textColor.lighter};
      }
  
      &::-webkit-outer-spin-button,
      &::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
  
      &::-webkit-calendar-picker-indicator {
        background: white;
        color: ${vars.textColor.default};
        cursor: pointer;
      }
  
      &:focus {
        outline-color: ${vars.themeColor.primary.default};
      }
  
      &:disabled {
        background: ${vars.bgColor};
        color: ${vars.textColor.light};
      }
  
      &[type='color'] {
        padding: 0 ${vars.gap.xs} !important;
      }
    }
  
    > ._invalid-indicator {
      display: none;
    }
  
    > input[sd-invalid=true] + ._invalid-indicator,
    > input:invalid + ._invalid-indicator {
      display: block;
      position: absolute;
      top: 2px;
      left: 2px;
      border-radius: 100%;
      width: 4px;
      height: 4px;
      background: ${vars.themeColor.danger.default};
    }
  
    &[sd-inset=true] {
      height: 100%;
  
      > input,
      > textarea {
        display: block;
        border: none;
        background: ${vars.themeColor.info.lightest};
      }
  
      > textarea {
        height: 100%;
        resize: none;
      }
    }
  }`;