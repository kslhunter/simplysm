import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdNote = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-note"], o => o
    .style({
      "display": "block",
      "padding": `${s.vars.gap.sm} ${s.vars.gap.default}`,
      "background": s.vars.themeColor.grey.lightest,
      "border-left": `${s.vars.gap.xxs} solid ${s.vars.transColor.default}`
    })
    .forEach(Object.keys(s.vars.themeColor), (o, key) => o
      .select([`&[sd-theme=${key}]`], o => o
        .style({
          "background": s.vars.themeColor[key].lightest,
          "border-color": s.vars.themeColor[key].lighter
        })
      )
    )
  );
