import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdModal = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-modal"], o => o
    .style({
      "display": `block`,
      "position": `absolute`,
      "z-index": `${s.vars.zIndex.modal}`,
      "top": `0`,
      "left": `0`,
      "width": `100%`,
      "height": `100%`,
      "text-align": `center`,
      "padding-top": `25px`,
      "overflow": `auto`
    })
    .select(["> ._backdrop"], o => o
      .style({
        "position": `absolute`,
        "top": `0`,
        "left": `0`,
        "width": `100%`,
        "height": `100%`,
        "background": `rgba(0, 0, 0, .6)`
      })
    )
    .select(["> ._dialog"], o => o
      .style({
        "position": `relative`,
        "display": `inline-block`,
        "text-align": `left`,
        "margin": `0 auto`,
        "background": `white`,
        "overflow": `hidden`,
        "max-width": `100%`,
        "min-width": `240px`,
        ...s.mixins.elevation(16),
        "border-bottom-left-radius": "4px",
        "border-bottom-right-radius": "4px",
        "border": `1px solid ${s.vars.topbarTheme}`
      })
      .select(["&:focus"], o => o
        .style({
          "outline-color": `transparent`
        })
      )
      .select(["> sd-dock-container"], o => o
        .select(["> ._header"], o => o
          .style({
            "background": `${s.vars.topbarTheme}`,
            "color": `white`
          })
          .select(["> ._title"], o => o
            .style({
              "display": `inline-block`,
              "padding": `${s.vars.gap.default} ${s.vars.gap.lg}`
            })
          )
          .select(["> ._close-button"], o => o
            .style({
              "float": `right`,
              "cursor": `pointer`,
              "text-align": `center`,
              "padding": `${s.vars.gap.default} ${s.vars.gap.lg}`,
              "color": `${s.vars.topbarLinkColor}`
            })
            .select(["&:hover"], o => o
              .style({
                "background": `rgba(0, 0, 0, .1)`,
                "color": `${s.vars.topbarLinkHoverColor}`
              })
            )
            .select(["&:active"], o => o
              .style({
                "background": `rgba(0, 0, 0, .2)`
              })
            )
          )
        )
      )
    )
    .style({
      "opacity": `0`,
      "transition": `opacity .3s ease-in-out`,
      "pointer-events": `none`
    })
    .select(["> ._dialog"], o => o
      .style({
        "transform": `translateY(-25px)`,
        "transition": `transform .3s ease-in-out`
      })
    )
    .select(["&[sd-open=true]"], o => o
      .style({
        "opacity": `1`,
        "pointer-events": `auto`
      })
      .select(["> ._dialog"], o => o
        .style({
          "transform": `none`
        })
      )
    )
    .select([`@media ${s.vars.media.mobile}`], o => o
      .style({
        "padding-top": `0`
      })
      .select(["> ._dialog"], o => o
        .style({
          "width": `100%`,
          "height": `100%`
        })
      )
    )
  );
