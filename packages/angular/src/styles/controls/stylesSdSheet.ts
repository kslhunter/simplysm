import {SdStyleProvider} from "../../provider/SdStyleProvider";


export const stylesSdSheet = (vars: SdStyleProvider) => {
  const paddingV = vars.sheetPaddingV;
  const paddingH = vars.sheetPaddingH;
  const rowHeight = Math.floor(vars.stripUnit(paddingV) * 2 + vars.stripUnit(vars.lineHeight) * vars.stripUnit(vars.fontSize.default)) + "px";

  return /* language=LESS */ `
    sd-sheet {
      display: block;
      position: relative;
      width: 100%;
      max-height: 100%;
      overflow: auto;
      background: ${vars.bgColor};
      z-index: 0;
  
      ._content {
        white-space: nowrap;
        width: fit-content;
      }
  
      ._head {
        display: block;
        position: absolute;
        z-index: 2;
        top: 0;
        left: 0;
        white-space: nowrap;
      }
  
      ._col-group {
        display: inline-block;
      }
  
      ._col {
        position: relative;
        display: inline-block;
        vertical-align: top;
        height: ${vars.stripUnit(rowHeight) + 1}px;
  
        &:focus {
          outline-color: transparent;
        }
      }
  
      ._head ._col {
        background: ${vars.themeColor.grey.lighter};
        text-align: center;
        padding: ${paddingV} ${paddingH};
        border-bottom: 1px solid ${vars.themeColor.grey.light};
        user-select: none;
  
        > ._border {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          width: 4px;
          border-right: 1px solid ${vars.themeColor.grey.light};
        }
      }
  
      ._body ._col {
        background: white;
        border-right: 1px solid ${vars.themeColor.grey.light};
        border-bottom: 1px solid ${vars.themeColor.grey.light};
  
        sd-textfield > input {
          border: none;
          padding: ${paddingV} ${paddingH};
          background: ${vars.themeColor.info.lightest};
  
          &[type=year],
          &[type=month],
          &[type=date],
          &[type=datetime],
          &[type=time],
          &[type=datetime-local] {
            padding: ${vars.stripUnit(paddingV) - 2}px ${paddingH};
          }
          
          &[type=color] {
            height: ${Math.floor(vars.stripUnit(paddingV) * 2 + vars.stripUnit(vars.lineHeight) * vars.stripUnit(vars.fontSize.default))}px;
          }
  
          &:disabled {
            background: transparent;
            color: ${vars.textColor.default};
          }
        }
  
        sd-combobox {
          > ._icon {
            top: 0;
            right: 0;
            width: ${rowHeight};
            padding: ${paddingV} 0;
          }
  
          > sd-textfield > input {
            padding-right: ${rowHeight};
          }
        }
  
        sd-checkbox > label {
          display: inline-block;
          width: auto;
          border: none;
          padding: ${paddingV} ${paddingH};
  
          > ._indicator_rect {
            background: ${vars.themeColor.info.lightest};
          }
  
          > input:disabled + ._indicator_rect {
            background: transparent;
          }
        }
  
        sd-button > button {
          border: none;
          padding: ${paddingV} ${paddingH};
          text-align: left;
        }
  
        sd-select,
        sd-multi-select {
          > sd-dropdown > div {
            border: none;
            padding: ${paddingV} ${paddingH};
            height: ${rowHeight};
            background: ${vars.themeColor.info.lightest};
            border-radius: 0;
  
            > ._icon {
              top: 0;
              right: 0;
              width: ${rowHeight};
              padding: ${paddingV} 0;
            }
          }
  
          &[sd-disabled=true] > sd-dropdown > div {
            background: transparent;
            color: ${vars.textColor.default};
  
            > ._icon {
              display: none;
            }
          }
        }
  
        > ._focus-indicator {
          position: absolute;
          opacity: 0;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          outline: 2px solid ${vars.themeColor.primary.default};
          outline-offset: -2px;
          pointer-events: none;
          transition: opacity .1s linear;
        }
  
        &:focus {
          z-index: 3;
        }
  
        &:focus > ._focus-indicator {
          opacity: 1;
        }
      }
  
      ._head ._col._first-col,
      ._body ._col._first-col {
        width: ${rowHeight};
        text-align: center;
        padding: ${paddingV};
        /*border-left: 1px solid theme-color(grey, light);*/
      }
  
      ._body ._col._first-col {
        background: ${vars.themeColor.grey.lighter};
      }
  
      ._fixed-col-group {
        position: absolute;
        z-index: 1;
        top: 0;
        left: 0;
      }
  
      ._row {
        position: relative;
      }
  
      &[sd-selectable=true] ._body ._first-col {
        cursor: pointer;
      }
    }`;
};
