import {SdStyleProvider} from "../../provider/SdStyleProvider";

export const stylesSdDock = (vars: SdStyleProvider) => /* language=LESS */ `
  sd-dock {
    display: block;
    position: absolute;
    background: white;
    overflow: auto;
    z-index: 1;
  
    &[sd-position=top] {
      border-bottom: 1px solid ${vars.transColor.default};
    }
  
    &[sd-position=bottom] {
      border-top: 1px solid ${vars.transColor.default};
    }
  
    &[sd-position=left] {
      border-right: 1px solid${vars.transColor.default};
    }
  
    &[sd-position=right] {
      border-left: 1px solid ${vars.transColor.default};
    }
  
    > hr {
      display: none;
      user-select: none;
    }
  
    &[sd-resizable=true] {
      > hr {
        display: block;
        position: absolute;
        width: 4px;
        height: 4px;
        background: ${vars.transColor.default};
        margin: 0;
        padding: 0;
        border: none;
        z-index: 1;
      }
  
      &[sd-position=top] {
        padding-bottom: 4px;
  
        > hr {
          bottom: 0;
          left: 0;
          width: 100%;
          cursor: ns-resize;
        }
      }
  
      &[sd-position=bottom] {
        padding-top: 4px;
  
        > hr {
          top: 0;
          left: 0;
          width: 100%;
          cursor: ns-resize;
        }
      }
  
      &[sd-position=left] {
        padding-right: 4px;
  
        > hr {
          top: 0;
          right: 0;
          height: 100%;
          cursor: ew-resize;
        }
      }
  
      &[sd-position=right] {
        padding-left: 4px;
  
        > hr {
          top: 0;
          left: 0;
          height: 100%;
          cursor: ew-resize;
        }
      }
    }
  }`;