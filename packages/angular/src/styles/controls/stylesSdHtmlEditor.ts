import {SdStyleProvider} from "../../provider/SdStyleProvider";

export const stylesSdHtmlEditor = (vars: SdStyleProvider) => /* language=LESS */ `
  sd-html-editor {
    display: block;
    border: 1px solid ${vars.transColor.default};

    > sd-dock-container {
      > ._toolbar {
        user-select: none;

        > a {
          display: inline-block;
          padding: ${vars.gap.sm} 0;
          text-align: center;
          width: ${vars.stripUnit(vars.gap.sm) * 2 + vars.stripUnit(vars.lineHeight) * vars.stripUnit(vars.fontSize.default)}px;

          &:hover {
            background: rgba(0, 0, 0, .05);
          }

          &._selected {
            background: ${vars.themeColor.primary.default};
            color: ${vars.textReverseColor.default};
          }
        }
      }

      > sd-pane {
        > div {
          ${vars.formControlBase};
          height: 100%;

          &[contenteditable=true] {
            cursor: text;
            background: ${vars.themeColor.info.lightest};
          }
        }

        > textarea {
          ${vars.formControlBase};
          height: 100%;
          background: ${vars.themeColor.info.lightest};
          border: none;
          transition: outline-color .1s linear;
          outline: 1px solid transparent;
          outline-offset: -1px;

          &::-webkit-input-placeholder {
            color: ${vars.textColor.lighter};
          }

          &:focus {
            outline-color: ${vars.themeColor.primary.default};
          }
        }
      }
    }

    &[sd-inset=true] {
      height: 100%;
      border: none;
    }
  }`;