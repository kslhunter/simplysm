import {SdStyleProvider} from "../provider/SdStyleProvider";

export const stylesToast = (vars: SdStyleProvider) => /* language=LESS */ `
  ._sd-toast-container {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    height: 100%;
    pointer-events: none;
    padding: ${vars.gap.lg};
    z-index: ${vars.zIndex.toast};

    > ._sd-toast {
      display: block;
      margin-bottom: ${vars.gap.sm};

      > ._sd-toast-block {
        display: inline-block;
        color: white;
        animation: _sd-toast-show .1s ease-out forwards;
        transform: translateX(-100%);
        border-radius: 2px;
        opacity: .9;
        ${vars.elevation(6)};

        > ._sd-toast-message {
          padding: ${vars.gap.sm} ${vars.gap.default};
        }

        > ._sd-toast-progress {
          background: ${vars.themeColor.grey.default};
          height: 4px;
          border-radius: 2px;

          > ._sd-toast-progress-bar {
            height: 4px;
            transition: width 1s ease-out;
          }
        }
      }
      ` +
  Object.keys(vars.themeColor).map(key => `
    &._sd-toast-${key} {
      > ._sd-toast-block {
        background: ${vars.themeColor[key].default};

        > ._sd-toast-progress {
          > ._sd-toast-progress-bar {
            background: ${vars.themeColor[key].default};
          }
        }
      }
    }`
  ).join("\n") + `
    }
  }

  @keyframes _sd-toast-show {
    from {
      left: calc(${vars.gap.lg} - 100%);
      transform: translateX(left);
    }
    to {
      transform: none;
    }
  }`;
