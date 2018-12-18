import {SdStyleProvider} from "../../provider/SdStyleProvider";

export const stylesSdMultiSelect = (vars: SdStyleProvider) => /* language=LESS */ `
  sd-multi-select {
    display: block;
    width: 100%;

    > sd-dropdown > div {
      ${vars.formControlBase};

      text-align: left;
      display: block;
      overflow: visible;
      padding-right: 30px !important;
      height: ${vars.stripUnit(vars.gap.sm) * 2 + vars.stripUnit(vars.lineHeight) * vars.stripUnit(vars.fontSize.default) + 2}px;

      background: white;
      border-color: ${vars.transColor.default};
      transition: outline-color .1s linear;
      outline: 1px solid transparent;
      outline-offset: -1px;

      > div:first-child {
        overflow: hidden;
        white-space: nowrap;
      }

      > ._icon {
        position: absolute;
        top: -1px;
        right: -1px;
        padding: ${vars.gap.sm} 0;
        width: 30px;
        text-align: center;
        pointer-events: none;
      }

      &:focus {
        outline-color: ${vars.themeColor.primary.default};
      }
    }

    &[sd-disabled=true] > sd-dropdown > div {
      background: ${vars.bgColor};
      color: ${vars.textColor.light};
    }
  }`;