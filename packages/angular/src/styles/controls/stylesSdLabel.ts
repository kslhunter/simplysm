import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdLabel = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-label"], o => o
    .style({
      "display": "inline-block",
      "background": s.vars.themeColor.grey.darkest,
      "color": s.vars.textReverseColor.default,
      "padding": `0 ${s.vars.gap.xs}`,
      "border-radius": "2px",
      "text-indent": "0"
    })
    .forEach(Object.keys(s.vars.themeColor), (o, key) => o
      .select([`&[sd-theme='${key}']`], o => o
        .style({
          "background": s.vars.themeColor[key].default
        })
      )
    )
    .select(["&[sd-clickable=true]"], o => o
      .style({
        "cursor": "pointer"
      })
      .select(["&:hover"], o => o
        .style({
          "background": s.vars.themeColor.grey.dark
        })
        .forEach(Object.keys(s.vars.themeColor), (o, key) => o
          .select([`&[sd-theme='${key}']`], o => o
            .style({
              "background": s.vars.themeColor[key].dark
            })
          )
        )
      )
    )
  );
