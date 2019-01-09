import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdTopbar = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-topbar"], o => o
    .style({
      "display": `block`,
      "position": `absolute`,
      "z-index": `${s.vars.zIndex.topbar}`,
      "top": `0`,
      "left": `0`,
      "width": `100%`,
      "height": ` ${s.vars.topbarHeight}`,
      "line-height": `${s.fns.stripUnit(s.vars.topbarHeight) - 1}px`,
      "background": `${s.vars.topbarTheme}`,
      "color": `${s.vars.textReverseColor.default}`,
      ...s.mixins.elevation(4)
    })
    .select(["> *"], o => o
      .style({
        "float": `left`,
        "line-height": `${s.fns.stripUnit(s.vars.topbarHeight) - 1}px`
      })
    )
    .select(["> a"], o => o
      .style({
        "min-width": ` ${s.vars.topbarHeight}`,
        "text-align": `center`,
        "margin-right": `${s.vars.gap.sm}`,
        "color": `${s.vars.textReverseColor.dark}`
      })
      .select(["&:hover", "&:focus"], o => o
        .style({
          "color": `${s.vars.textReverseColor.default}`
        })
      )
    )
    .select(["> h1", "> h2", "> h3", "> h4", "> h5", "> h6"], o => o
      .style({
        "padding-right": `${s.vars.gap.default}`
      })
    )
  );
