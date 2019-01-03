import {SdStyleProvider} from "../../provider/SdStyleProvider";

export const stylesSdMarkdownEditor = (vars: SdStyleProvider) => /* language=LESS */ `
  sd-markdown-editor {
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

      > sd-pane > ._editor {
        position: relative;
        width: 100%;
        height: 100%;

        > textarea {
          ${vars.formControlBase};
          height: 100%;
          background: ${vars.themeColor.secondary.lightest};
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

          > ._invalid-indicator {
            display: none;
          }

          > input[sd-invalid=true] + ._invalid-indicator,
          > input:invalid + ._invalid-indicator {
            display: block;
            position: absolute;
            top: 2px;
            left: 2px;
            border-radius: 100%;
            width: 4px;
            height: 4px;
            background: ${vars.themeColor.danger.default};
          }
        }

        > ._dragover {
          display: none;
          pointer-events: none;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, .05);
          font-size: ${vars.fontSize.h1};
          color: rgba(0, 0, 0, .3);
          text-align: center;
          padding-top: 20px;
        }
      }

      > sd-pane > ._preview {
        /*border: 1px solid trans-color(default);*/
        padding: ${vars.gap.sm};
        height: 100%;
        overflow: auto;
        //background: theme-color(grey, lightest);
        background: white;

        ol {
          padding-left: 20px;
        }

        code {
          background: rgba(0, 0, 0, .05);
          border-radius: 2px;
        }

        pre {
          background: rgba(0, 0, 0, .05);
          padding: ${vars.gap.sm} ${vars.gap.default};
          border-radius: 2px;
          white-space: pre-wrap;

          > code {
            background: transparent;
          }
        }

        p {
          margin-top: ${vars.gap.sm};
          margin-bottom: ${vars.gap.sm};
        }
      }
    }

    &[sd-disabled=true] {
      > sd-dock-container {
        > sd-pane > ._preview {
          height: auto;
        }
      }
    }

    &[sd-dragover=true] {
      > sd-dock-container > sd-pane > ._editor > ._dragover {
        display: block;
      }
    }
  }`;
