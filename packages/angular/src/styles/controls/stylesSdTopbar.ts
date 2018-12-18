import {SdStyleProvider} from "../../provider/SdStyleProvider";

export const stylesSdTopbar = (vars: SdStyleProvider) => /* language=LESS */ `
  sd-topbar {
    display: block;
    position: absolute;
    z-index: ${vars.zIndex.topbar};
    top: 0;
    left: 0;
    width: 100%;
    height: 36px;
    line-height: 35px;
    background: ${vars.topbarTheme};
    color: ${vars.textReverseColor.default};
  
    > * {
      float: left;
      line-height: 35px;
    }
  
    > a {
      min-width: 36px;
      text-align: center;
      margin-right: ${vars.gap.sm};
      color: ${vars.textReverseColor.dark};
  
      &:hover,
      &:focus {
        color: ${vars.textReverseColor.default};
      }
    }
  
    > h1,
    > h2,
    > h3,
    > h4,
    > h5,
    > h6 {
      padding-right: ${vars.gap.default};
    }
  }`;