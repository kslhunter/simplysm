import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdTextfield = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-textfield"], o => {
      const st = o
        .style({
          "display": "block",
          "position": "relative"
        })
        .select(["> input", "> textarea"], o => o
          .style({
            ...s.mixins.formControlBase(),
            "background": "white",
            "border-color": s.vars.transColor.default,
            "transition": "outline-color .1s linear",
            "outline": "1px solid transparent",
            "outline-offset": "-1px"
          })
          .select(["&::-webkit-input-placeholder"], o => o
            .style({
              "color": s.vars.textColor.lighter
            })
          )
          .select(["&::-webkit-outer-spin-button", "&::-webkit-inner-spin-button"], o => o
            .style({
              "-webkit-appearance": "none",
              "margin": "0"
            })
          )
          .select(["&::-webkit-calendar-picker-indicator"], o => o
            .style({
              "background": "white",
              "color": s.vars.textColor.default,
              "cursor": "pointer"
            })
          )
          .select(["&:focus"], o => o
            .style({
              "outline-color": s.vars.themeColor.primary.default
            })
          )
          .select(["&:disabled"], o => o
            .style({
              "background": s.vars.bgColor,
              "color": s.vars.textColor.light
            })
          )
          .select(["&[type='color']"], o => o
            .style({
              "padding": `1px ${s.vars.gap.default} !important`,
              "height": (s.fns.stripUnit(s.vars.gap.sm) * 2 + s.fns.stripUnit(s.vars.lineHeight) * s.fns.stripUnit(s.vars.fontSize.default) + 2) + "px"
            })
          )
          .select(["&[type=year]", "&[type=month]", "&[type=date]", "&[type=datetime]", "&[type=time]", "&[type=datetime-local]"], o => o
            .style({
              "padding": `${s.fns.stripUnit(s.vars.gap.sm) - 1}px ${s.vars.gap.default}`
            })
          )
        )
        .select(["._invalid-indicator"], o => o
          .style({
            "display": "none"
          })
        )
        .select(["> input[sd-invalid=true] + ._invalid-indicator", "> input:invalid + ._invalid-indicator"], o => o
          .style({
            "display": "block",
            "position": "absolute",
            "top": "2px",
            "left": "2px",
            "border-radius": "100%",
            "width": "4px",
            "height": "4px",
            "background": s.vars.themeColor.danger.default
          })
        )
        .select(["&[sd-inset=true]"], o => o
          .style({
            "height": "100%"
          })
          .select(["> input", "> textarea"], o => o
            .style({
              "display": "block",
              "border": "none",
              "background": s.vars.themeColor.info.lightest
            })
          )
          .select(["> textarea"], o => o
            .style({
              "height": "100%",
              "resize": "none"
            })
          )
        )
        .select(["&[sd-inline=true]"], o => o
          .style({
            "display": "inline-block"
          })
        )
        .select(["&[sd-size=sm] > input", "&[sd-size=sm] > textarea"], o => o
          .style({
            "padding": `${s.vars.gap.xs} ${s.vars.gap.sm}`
          })
        )
        .select(["&[sd-size=lg] > button", "&[sd-size=lg] > textarea"], o => o
          .style({
            "padding": `${s.vars.gap.default} ${s.vars.gap.lg}`
          })
        );

      for (const key of Object.keys(s.vars.themeColor)) {
        for (const key1 of Object.keys(s.vars.themeColor[key])) {
          const themeColor = s.vars.themeColor[key][key1];
          st.select([`&.sd-text-color-${key}-${key1}`], o => o
            .select(["> input", "> textarea"], o => o
              .style({
                "color": `${themeColor} !important`
              })
            )
          );
        }
      }

      return st;
    }
  );
