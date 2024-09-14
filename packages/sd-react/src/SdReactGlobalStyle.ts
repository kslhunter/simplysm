import { createGlobalStyle, css } from "styled-components";
import { generateCssVariables, varKeys } from "./style/genCssVariable";
import { TSdTheme } from "./contexts/SdThemeContext";
import { variables } from "./style/variables";
import { variablesKiosk } from "./style/variables-kiosk";
import { variablesMobile } from "./style/variables-mobile";
import { variablesCompact } from "./style/variables-compact";
import pretendard from "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import { mixins } from "./style/mixins";

const Pretendard = [
  css`
    @import "${pretendard}";
  `,
];

const Root = (theme) => [
  css`
    :root {
      ${theme === "kiosk"
        ? generateCssVariables(variablesKiosk)
        : theme === "mobile"
          ? generateCssVariables(variablesMobile)
          : theme === "compact"
            ? generateCssVariables(variablesCompact)
            : generateCssVariables(variables)}
    }
  `,
];

const DefaultContainer = [
  css`
    *,
    *:after,
    *:before {
      box-sizing: border-box;
      outline-color: var(--theme-primary-default);

      -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
    }

    *:focus {
      outline: none;
    }

    html,
    body {
      height: 100%;
      width: 100%;
      padding: 0;
      margin: 0;
    }

    body {
      background: var(--background-color);
      color: var(--text-trans-default);
      font-family: var(--font-family);
      font-size: var(--font-size-default);
      line-height: var(--line-height);
    }
  `,
];

const DefaultTag = [
  css`
    hr {
      border: none;
      height: 1px;
      background-color: var(--border-color-light);
    }

    p {
      margin: 0;
    }

    pre,
    code {
      font-size: var(--font-size-default);
      line-height: var(--line-height);
      margin: 0;
    }

    pre {
      font-family: var(--font-family);
    }

    code {
      font-family: var(--font-family-monospace);
    }

    small {
      vertical-align: top;
    }

    sub {
      display: inline-block;
      overflow: visible;
      height: 0;
    }

    form {
      display: inline;
    }
  `,
];

const DefaultAttr = [
  css`
    [hidden] {
      display: none !important;
    }
  `,
];

const ScrollBar = [
  css`
    *::-webkit-scrollbar {
      width: 16px;
      height: 16px;
    }

    *::-webkit-scrollbar-thumb {
      background-color: var(--theme-grey-light);
      border-radius: 12px;
      background-clip: padding-box;
      border: 4px solid transparent;
    }

    *::-webkit-scrollbar-track {
      &:hover {
        background-color: var(--theme-grey-lighter);
        border-radius: 8px;
        background-clip: padding-box;
        border: 2px solid transparent;
      }
    }

    *::-webkit-scrollbar-corner {
      background: transparent;
    }
  `,
];

const FontSize = [
  ...["h1", "h2", "h3", "h4", "h5", "h6"].map(
    (h) => css`
      ${h} {
        font-size: var(--font-size-${h});
        line-height: var(--line-height);
        margin: 0;
      }
    `,
  ),
  ...varKeys("fontSize").map(
    (key) => css`
      .ft-size-${key} {
        font-size: var(--font-size-${key}) !important;
        line-height: var(--line-height) !important;
      }
    `,
  ),
];

const BgColor = [
  ...varKeys("theme").map(
    (key) => css`
      .bg-theme-${key} {
        background: var(--theme-${key}) !important;
      }
    `,
  ),
  ...varKeys("trans").map(
    (key) => css`
      .bg-trans-${key} {
        background: var(--trans-${key}) !important;
      }
    `,
  ),
  css`
    .bg-white {
      background: white !important;
    }

    .bg-default {
      background: var(--background-color) !important;
    }
  `,
];

const TextColor = [
  ...varKeys("theme").map(
    (key) => css`
      .tx-theme-${key} {
        color: var(--theme-${key}) !important;
      }
    `,
  ),
  ...varKeys("textTrans").map(
    (key) => css`
      .tx-trans-${key} {
        color: var(--text-trans-${key}) !important;
      }
    `,
  ),
];

const Border = [
  css`
    .bd {
      border: 1px solid !important;
    }
  `,
  ...varKeys("theme").map(
    (key) => css`
      .bd-theme-${key} {
        border-color: var(--theme-${key}) !important;
      }
    `,
  ),
  ...varKeys("trans").map(
    (key) => css`
      .bd-trans-${key} {
        border-color: var(--trans-${key}) !important;
      }
    `,
  ),
  ...varKeys("borderColor").map(
    (key) => css`
      .bd-color-${key} {
        border-color: var(--border-color-${key}) !important;
      }
    `,
  ),
  css`
    .bd-none {
      border: none !important;
    }

    .bd-trans {
      border-color: transparent !important;
    }
  `,
  ...["top", "right", "bottom", "left"].map((dir) => {
    const d = dir[0];
    return css`
      .bd${d} {
        border-${dir}: 1px solid !important;
      }

      ${varKeys("theme").map(
        (key) => css`
          .bd${d}-theme-${key} {
            border-${dir}-color: var(--theme-${key}) !important;
          }
        `,
      )}
      ${varKeys("trans").map(
        (key) => css`
          .bd${d}-trans-${key} {
            border-${dir}-color: var(--trans-${key}) !important;
          }
        `,
      )}
      ${varKeys("borderColor").map(
        (key) => css`
          .bd${d}-color-${key} {
            border-${dir}-color: var(--border-color-${key}) !important;
          }
        `,
      )}
      .bd${d}-none {
        border-${dir}: none !important;
      }

      .bd${d}-trans {
        border-${dir}-color: transparent !important;
      }
    `;
  }),
  //-- BORDER WIDTH
  ...varKeys("gap").map(
    (key) => css`
      .bd-width-${key} {
        border-width: var(--gap-${key}) !important;
      }

      ${["top", "right", "bottom", "left"].map((dir) => {
        const d = dir[0];
        return css`
          .bd${d}-width-${key} {
            border-${dir}-width: var(--gap-${key}) !important;
          }
        `;
      })}
    `,
  ),
  //-- BORDER RADIUS
  ...varKeys("borderRadius").map(
    (key) => css`
      .bd-radius-${key} {
        border-radius: var(--border-radius-${key}) !important;
      }

      .bdt-radius-${key} {
        border-top-right-radius: var(--border-radius-${key}) !important;
        border-top-left-radius: var(--border-radius-${key}) !important;
      }

      .bdb-radius-${key} {
        border-bottom-right-radius: var(--border-radius-${key}) !important;
        border-bottom-left-radius: var(--border-radius-${key}) !important;
      }

      .bdl-radius-${key} {
        border-top-left-radius: var(--border-radius-${key}) !important;
        border-bottom-left-radius: var(--border-radius-${key}) !important;
      }

      .bdr-radius-${key} {
        border-top-right-radius: var(--border-radius-${key}) !important;
        border-bottom-right-radius: var(--border-radius-${key}) !important;
      }
    `,
  ),
];

//-- PADDING, MARGIN
const Gap = [
  ...varKeys("gap").map(
    (key) => css`
      .p-${key} {
        padding: var(--gap-${key}) !important;
      }

      .m-${key} {
        margin: var(--gap-${key}) !important;
      }
    `,
  ),
  ...varKeys("gap").map((key) =>
    varKeys("gap").map(
      (key1) => css`
        .p-${key}-${key1} {
          padding: var(--gap-${key}) var(--gap-${key1}) !important;
        }

        .m-${key}-${key1} {
          margin: var(--gap-${key}) var(--gap-${key1}) !important;
        }
      `,
    ),
  ),
  ...varKeys("gap").map(
    (key) => css`
      .pv-${key} {
        padding-top: var(--gap-${key}) !important;
        padding-bottom: var(--gap-${key}) !important;
      }

      .ph-${key} {
        padding-left: var(--gap-${key}) !important;
        padding-right: var(--gap-${key}) !important;
      }

      .mv-${key} {
        margin-top: var(--gap-${key}) !important;
        margin-bottom: var(--gap-${key}) !important;
      }

      .mh-${key} {
        margin-left: var(--gap-${key}) !important;
        margin-right: var(--gap-${key}) !important;
      }
    `,
  ),
  ...varKeys("gap").map(
    (key) => css`
      .sw-${key} {
        width: var(--gap-${key}) !important;
      }

      .sh-${key} {
        height: var(--gap-${key}) !important;
      }
    `,
  ),
  ...varKeys("gap").map((key) =>
    ["top", "right", "bottom", "left"].map((dir) => {
      const d = dir[0];
      return css`
        .p${d}-${key} {
          padding-${dir}: var(--gap-${key}) !important;
        }

        .m${d}-${key} {
          margin-${dir}: var(--gap-${key}) !important;
        }

        .${d}-${key} {
          ${dir}: var(--gap-${key}) !important;
        }
      `;
    }),
  ),
];

const TextAlign = [
  ...["left", "right", "center"].map(
    (align) => css`
      .tx-${align} {
        text-align: ${align} !important;
      }
    `,
  ),
];

//-- FLEX
const Flex = [
  css`
    .flex-row {
      display: flex !important;
      flex-wrap: nowrap;
      flex-direction: row;
    }

    .flex-row-inline {
      display: inline-flex !important;
      flex-wrap: nowrap;
      flex-direction: row;
      white-space: nowrap;
    }

    .flex-column {
      display: flex !important;
      flex-wrap: nowrap;
      flex-direction: column;
    }

    .flex-column-inline {
      display: inline-flex !important;
      flex-wrap: nowrap;
      flex-direction: column;
      white-space: nowrap;
    }

    .flex-grow {
      flex-grow: 1;
      overflow: auto;
    }

    .flex-grow-0 {
      flex-grow: 0;
    }
  `,
  ...varKeys("gap").map(
    (key) => css`
      .flex-gap-${key} {
        gap: var(--gap-${key}) !important;
      }
    `,
  ),
];

//-- ETC
const Etc = [
  css`
    .sh-topbar {
      height: var(--topbar-height) !important;
    }

    .sw-sidebar {
      width: var(--sidebar-width) !important;
    }

    .form-control {
      ${mixins.formControlBase()}
    }

    .help {
      ${mixins.help()};
    }

    .page-header {
      line-height: var(--line-height);
      margin-bottom: var(--gap-sm);
      padding-bottom: var(--gap-xxs);

      font-size: var(--font-size-sm);
      color: var(--theme-grey-default);
    }

    .active-effect {
      ${mixins.activeEffect(true)}
    }
  `,
];

export const SdReactGlobalStyle = createGlobalStyle<{
  $theme?: TSdTheme;
}>`
  ${Pretendard}
  ${(props) => Root(props.$theme)}
  ${DefaultContainer}
  ${DefaultTag}
  ${DefaultAttr}
  ${ScrollBar}
  ${FontSize}
  ${BgColor}
  ${TextColor}
  ${Border}
  ${Gap}
  ${TextAlign}
  ${Flex}
  ${Etc}
`;
