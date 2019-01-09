import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdSelect = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-select"], o => o
    .style({
      "display": `block`,
      "width": `100%`
    })
    .select(["> sd-dropdown > div"], o => o
      .style({
        ...s.mixins.formControlBase(),
        "display": `block`,
        "overflow": `visible`,
        "padding-right": `30px !important`,
        "height": `${s.fns.stripUnit(s.vars.gap.sm) * 2 + s.fns.stripUnit(s.vars.lineHeight) * s.fns.stripUnit(s.vars.fontSize.default) + 2}px`,
        "background": `white`,
        "border-color": `${s.vars.transColor.default}`,
        "transition": `outline-color .1s linear`,
        "outline": `1px solid transparent`,
        "outline-offset": `-1px`,
        "cursor": `pointer`
      })
      .select(["> div:first-child"], o => o
        .style({
          "overflow": `hidden`,
          "white-space": `nowrap`
        })
      )
      .select(["> ._icon"], o => o
        .style({
          "position": `absolute`,
          "top": `-1px`,
          "right": `-1px`,
          "padding": `${s.vars.gap.sm} 0`,
          "width": `30px`,
          "text-align": `center`,
          "pointer-events": `none`
        })
      )
      .select(["&:focus"], o => o
        .style({
          "outline-color": `${s.vars.themeColor.primary.default}`
        })
      )
    )
    .select(["&[sd-disabled=true] > sd-dropdown > div"], o => o
      .style({
        "background": `${s.vars.bgColor}`,
        "color": `${s.vars.textColor.light}`,
        "cursor": `default`
      })
    )
    .select(["&[sd-invalid=true] > sd-dropdown > div > ._invalid-indicator"], o => o
      .style({
        "display": `block`,
        "position": `absolute`,
        "top": `2px`,
        "left": `2px`,
        "border-radius": `100%`,
        "width": `4px`,
        "height": `4px`,
        "background": `${s.vars.themeColor.danger.default}`
      })
    )
  );
