import {SdStyleProvider} from "../provider/SdStyleProvider";

export const stylesClasses = (vars: SdStyleProvider) => {
  let style = "";

  for (const key of Object.keys(vars.themeColor)) {
    for (const key1 of Object.keys(vars.themeColor[key])) {
      const val1 = vars.themeColor[key][key1];

      style += `.sd-background-${key}-${key1} {`;
      style += `background: ${val1} !important;`;

      if (key1 !== "lighter" && key1 !== "lightest") {
        style += "color: white;";
        style += /*language=LESS*/ `
          a {
            color: ${vars.textReverseColor.dark};

            &:hover,
            &:focus {
              color: ${vars.textReverseColor.default};
            }
          }

          sd-textfield > input {
            background: ${vars.transColor.light} !important;
            color: white !important;
            border-color: ${vars.transColor.light} !important;
          }

          sd-list-item[sd-header=true] > label {
            color: ${vars.textReverseColor.dark} !important;
          }
          
          sd-list-item > ._child > ._child-content {
            background: rgba(0, 0, 0, .2);
            
            sd-list-item > label {
              opacity: .8;
              &:hover {
                opacity: 1;
              }
            }
          }

          sd-checkbox {
            > label {
              color: ${vars.textReverseColor.default} !important;

              > ._indicator_rect {
                background: ${vars.transColor.light} !important;
                border-color: ${vars.transColor.light} !important;
              }

              > ._indicator {
                color: ${vars.textReverseColor.default} !important;
              }
            }

            &[sd-radio=true] {
              > label {
                > ._indicator > div {
                  background: ${vars.textReverseColor.default} !important;
                }
              }
            }
          }`;

        /*style += Object.keys(vars.themeColor).map(key2 => `
          sd-button[sd-theme=${key2}] > button {
            background: ${vars.themeColor[key2].default};
            border-color: ${vars.themeColor[key2].default};
            color: ${vars.textReverseColor.default};
    
            &:hover {
              background: ${vars.themeColor[key2].dark};
              border-color: ${vars.themeColor[key2].dark};
              color: ${vars.textReverseColor.default};
            }
    
            &:active {
              background: ${vars.themeColor[key2].darker};
              color: ${vars.textReverseColor.default};
            }
    
            &:disabled {
              background: ${vars.themeColor.grey.default};
              border-color: ${vars.themeColor.grey.default};
              cursor: default;
            }
          }`
        ).join("\n");*/
      }

      style += "}";
    }
  }
  style += `.sd-background-white {background: white !important;}`;
  style += `.sd-background-default {background: ${vars.bgColor} !important;}`;


  for (const key of Object.keys(vars.fontSize)) {
    const val = vars.fontSize[key];

    style += /*language=LESS*/ `
      .sd-font-size-${key} {
        font-size: ${val} !important;
      }`;
  }

  for (const key of Object.keys(vars.themeColor)) {
    for (const key1 of Object.keys(vars.themeColor[key])) {
      const val1 = vars.themeColor[key][key1];

      style += /*language=LESS*/ `
        .sd-text-color-${key}-${key1} {
          color: ${val1} !important;
        }`;
    }
  }
  style += `.sd-text-reverse-color-dark {color: ${vars.textReverseColor.dark} !important;}`;

  for (const key of Object.keys(vars.textColor)) {
    const val = vars.textColor[key];

    style += /*language=LESS*/ `
      .sd-text-color-${key} {
        color: ${val} !important;
      }`;
  }


  for (const direction of ["top", "right", "bottom", "left"]) {
    for (const key of Object.keys(vars.themeColor)) {
      for (const key1 of Object.keys(vars.themeColor[key])) {
        style += /*language=LESS*/ `
          .sd-border-${direction}-${key}-${key1} {
            border-${direction}: 1px solid ${vars.themeColor[key][key1]};
          }`;
      }
    }

    for (const key of Object.keys(vars.transColor)) {
      style += /*language=LESS*/ `
        .sd-border-${direction}-${key} {
          border-${direction}: 1px solid ${vars.transColor[key]};
        }`;
    }


    style += /*language=LESS*/ `
      .sd-border-${direction}-none {
        border-${direction}: none !important;
      }`;
  }


  for (const key of Object.keys(vars.themeColor)) {
    for (const key1 of Object.keys(vars.themeColor[key])) {
      style += /*language=LESS*/ `
        .sd-border-${key}-${key1} {
          border: 1px solid ${vars.themeColor[key][key1]};
        }`;
    }
  }

  for (const key of Object.keys(vars.transColor)) {
    style += /*language=LESS*/ `
      .sd-border-${key} {
        border: 1px solid ${vars.transColor[key]};
      }`;
  }

  for (const key of Object.keys(vars.gap)) {
    style += /*language=LESS*/ `
      .sd-padding-${key} {
        padding: ${vars.gap[key]};
      }`;

    for (const direction of ["top", "right", "bottom", "left"]) {
      style += /*language=LESS*/ `
        .sd-padding-${direction}-${key} {
          padding-${direction}: ${vars.gap[key]};
        }`;
    }

    for (const key1 of Object.keys(vars.gap)) {
      style += /*language=LESS*/ `
        .sd-padding-${key}-${key1} {
          padding: ${vars.gap[key]} ${vars.gap[key1]};
        }`;
    }
  }

  for (const key of Object.keys(vars.gap)) {
    style += /*language=LESS*/ `
      .sd-margin-${key} {
        margin: ${vars.gap[key]};
      }`;

    for (const direction of ["top", "right", "bottom", "left"]) {
      style += /*language=LESS*/ `
        .sd-margin-${direction}-${key} {
          margin-${direction}: ${vars.gap[key]};
        }`;
    }
  }


  return style;
};
