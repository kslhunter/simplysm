import {SdStyleProvider} from "../../provider/SdStyleProvider";

export const stylesSdSidebarContainer = (vars: SdStyleProvider) => /* language=LESS */ `
  sd-sidebar-container {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
    padding-left: 200px;
    transition: padding-left .1s ease-out;
  
    > sd-sidebar {
      transition: transform .1s ease-out;
    }
  
    > ._backdrop {
      display: none;
    }
  
    &[sd-toggle=true] {
      padding-left: 0;
      transition: padding-left .1s ease-in;
  
      > sd-sidebar {
        transform: translateX(-100%);
        transition: transform .1s ease-in;
      }
    }
  
    @media ${vars.media.mobile} {
      padding-left: 0;
      transition: none;
  
      > sd-sidebar {
        transform: translateX(-100%);
        transition: transform .1s ease-in;
      }
  
      &[sd-toggle=true] {
        > sd-sidebar {
          transform: none;
          transition: transform .1s ease-out;
        }
  
        > ._backdrop {
          display: block;
          position: absolute;
          z-index: ${vars.zIndex.sidebar - 1};
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, .6);
        }
      }
    }
  }`;