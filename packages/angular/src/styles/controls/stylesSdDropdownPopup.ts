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
    //border: 1px solid ${vars.transColor.dark};
    box-shadow: 0 1px 2px rgba(0, 0, 0, .3);
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
