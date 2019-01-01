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
      //box-shadow: inset 0 1px ${vars.transColor.default};
  
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
        padding: 1px ${vars.gap.default} !important;
        height: ${vars.stripUnit(vars.gap.sm) * 2 + vars.stripUnit(vars.lineHeight) * vars.stripUnit(vars.fontSize.default) + 2}px;
      }
      /*@media screen and (-webkit-min-device-pixel-ratio:0) {
      }*/
      
      &[type=year],
      &[type=month],
      &[type=date],
      &[type=datetime],
      &[type=time],
      &[type=datetime-local] {
        padding: ${vars.stripUnit(vars.gap.sm) - 1}px ${vars.gap.default};
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
