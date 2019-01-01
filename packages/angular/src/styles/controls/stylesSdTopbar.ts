import {SdStyleProvider} from "../../provider/SdStyleProvider";

export const stylesSdTopbar = (vars: SdStyleProvider) => /* language=LESS */ `
  sd-topbar {
    display: block;
    position: absolute;
    z-index: ${vars.zIndex.topbar};
    top: 0;
    left: 0;
    width: 100%;
    height:  ${vars.topbarHeight};
    line-height: ${vars.stripUnit(vars.topbarHeight) - 1}px;
    background: ${vars.topbarTheme};
    color: ${vars.textReverseColor.default};
    ${vars.elevation(4)};
  
    > * {
      float: left;
      line-height: ${vars.stripUnit(vars.topbarHeight) - 1}px;
    }
  
    > a {
      min-width:  ${vars.topbarHeight};
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
