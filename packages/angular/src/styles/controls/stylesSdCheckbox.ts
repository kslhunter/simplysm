import {SdStyleProvider} from "../../provider/SdStyleProvider";

export const stylesSdCheckbox = (vars: SdStyleProvider) => /* language=LESS */ `
  sd-checkbox {
    color: text-color(default);
  
    > label {
      ${vars.formControlBase};
      user-select: none;
    
      color: inherit;
      cursor: pointer;
      position: relative;
  
      > ._indicator_rect {
        position: absolute;
        display: block;
        width: ${vars.lineHeight};
        height: ${vars.lineHeight};
        border: 1px solid ${vars.transColor.default};
        background: white;
        vertical-align: top;
        transition: border-color .1s linear;
      }
  
      > ._indicator {
        display: inline-block;
        position: relative;
        opacity: 0;
        transition: opacity .1s linear;
        color:  ${vars.textColor.default};
        width: ${vars.lineHeight};
        height: ${vars.lineHeight};
        vertical-align: top;
      }
  
      > ._content {
        display: inline-block;
        vertical-align: top;
        text-indent: ${vars.gap.xs};
  
        > * {
          text-indent: 0;
        }
      }
  
      > input:disabled + ._indicator_rect {
        background: ${vars.bgColor};
      }
  
      &:focus {
        outline-color: transparent;
  
        > ._indicator_rect {
          border-color: ${vars.themeColor.primary.default};
        }
      }
    }
  
    &[sd-checked=true] {
      > label {
        > ._indicator {
          opacity: 1;
        }
      }
    }
  
    &[sd-inline=true] {
      display: inline-block;
  
      > label {
        padding-left: 0;
      }
    }
  
    &[sd-radio=true] {
      > label {
        > ._indicator_rect {
          border-radius: 100%;
        }
  
        > ._indicator {
          padding: 4px;
        }
  
        > ._indicator > div {
          border-radius: 100%;
          background: ${vars.textColor.default};
          width: 100%;
          height: 100%;
        }
      }
    }
  }`;