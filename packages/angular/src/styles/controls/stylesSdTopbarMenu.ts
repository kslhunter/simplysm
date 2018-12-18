import {SdStyleProvider} from "../../provider/SdStyleProvider";

export const stylesSdTopbarMenu = (vars: SdStyleProvider) => /* language=LESS */ `
  sd-topbar-menu {
    display: block;
    padding: 0 ${vars.gap.default};
    cursor: pointer;
    transition: .1s linear;
    transition-property: background, color;
    user-select: none;
    color: ${vars.topbarLinkColor};
    float: left;
  
    &:hover {
      background: ${vars.transColor.dark};
      color: ${vars.topbarLinkHoverColor};
    }
  
    &:active {
      transition: none;
      background: ${vars.transColor.dark};
      color: ${vars.topbarLinkHoverColor};
    }
  
    @media ${vars.media.mobile} {
      float: right;
    }
  }`;