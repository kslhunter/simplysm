import {SdStyleProvider} from "../../provider/SdStyleProvider";

export const stylesSdSidebar = (vars: SdStyleProvider) => /* language=LESS */ `
  sd-sidebar {
    display: block;
    position: absolute;
    z-index: ${vars.zIndex.sidebar};
    top: 0;
    left: 0;
    width: ${vars.sidebarWidth};
    height: 100%;
    background: white;
    ${vars.elevation(16)};
  }`;
