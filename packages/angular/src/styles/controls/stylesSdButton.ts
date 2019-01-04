import {SdStyleProvider} from "../../provider/SdStyleProvider";

export const stylesSdButton = (vars: SdStyleProvider) => /* language=LESS */ `
  sd-button {
    display: block;
    position: relative;
  
    & > button {
      ${vars.formControlBase};
      border: 1px solid transparent/*${vars.transColor.default}*/;
      ${vars.elevation(2)};
      font-weight: bold;
      transition: box-shadow .1s linear;
  
      background: white;
      cursor: pointer;
      color: ${vars.textColor.default};
  
      &:hover {
        ${vars.elevation(8)};
      }
  
      &:active {
        background: ${vars.transColor.dark};
        //box-shadow: none;
      }
  
      &:disabled {
        background: transparent;
        cursor: default;
        color: ${vars.textColor.default};
      }
  
      &:focus {
        outline-color: transparent;
        //border: 1px solid ${vars.themeColor.primary.darkest} !important;
        ${vars.elevation(8)};
      }
    }` +

  Object.keys(vars.themeColor).map(key => `
      &[sd-theme=${key}] > button {
        background: ${vars.themeColor[key].default};
        border-color: ${vars.themeColor[key].default};
        color: ${vars.textReverseColor.default};
        //color: ${vars.themeColor[key].default};
  
        &:hover {
          //background: ${vars.themeColor[key].dark};
          //border-color: ${vars.themeColor[key].dark};
          //color: ${vars.textReverseColor.default};
        }
  
        &:active {
           background: ${vars.themeColor[key].darker};
          //color: ${vars.textReverseColor.default};
        }
  
        &:disabled {
          background: ${vars.themeColor.grey.default};
          border-color: ${vars.themeColor.grey.default};
          cursor: default;
        }
      }`
  ).join("\n") + `
    
    &[sd-size=sm] > button {
      padding: ${vars.gap.xs} ${vars.gap.sm};
    }
  
    &[sd-size=lg] > button {
      padding: ${vars.gap.default} ${vars.gap.lg};
    }
  
    &[sd-inline=true] {
      display: inline-block;
  
      > button {
        width: auto;
      }
    }
  
    &[sd-invalid=true] > ._invalid-indicator {
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
      > button {
        border: none !important;
        box-shadow: none !important;
        
        &:hover {
          background: ${vars.transColor.default};
        }
    
        &:active {
          background: ${vars.transColor.dark};
        }
    
        &:disabled {
          background: transparent;
        }
      }
      
        
        ` +
  Object.keys(vars.themeColor).map(key => `
      &[sd-theme=${key}] > button {
        background: ${vars.themeColor[key].default};
        
        &:hover {
          background: ${vars.themeColor[key].dark};
        }
  
        &:active {
           background: ${vars.themeColor[key].darker};
        }
  
        &:disabled {
          background: ${vars.themeColor.grey.default};
        }
      }`
  ).join("\n") + `
    }
  }`;
