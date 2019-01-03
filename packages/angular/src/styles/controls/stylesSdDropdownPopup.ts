import {SdStyleProvider} from "../../provider/SdStyleProvider";

export const stylesSdDropdownPopup = (vars: SdStyleProvider) => /* language=LESS */ `
  sd-dropdown-popup {
    position: fixed;
    z-index: ${vars.zIndex.dropdown};
    opacity: 0;
    transform: translateY(-10px);
    transition: .1s linear;
    transition-property: transform, opacity;
    pointer-events: none;
    background: white;
    min-width: 120px;
    max-height: 300px;
    overflow: auto;
    //border: 1px solid ${vars.transColor.dark};
    ${vars.elevation(6)};
    //border-radius: 2px;

    &:focus {
      outline: 1px solid ${vars.themeColor.primary.default};
    }

    /*@media ${vars.media.mobile} {
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      border-radius: 0;
      box-shadow: none;
    }*/
  }`;
