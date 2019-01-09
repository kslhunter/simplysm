import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdSidebarContainer = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-sidebar-container"], o => o
    .style({
      "display": `block`,
      "position": `relative`,
      "width": `100%`,
      "height": `100%`,
      "padding-left": ` ${s.vars.sidebarWidth}`,
      "transition": `padding-left .1s ease-out`
    })
    .select(["> sd-sidebar"], o => o
      .style({
        "transition": `transform .1s ease-out`
      })
    )
    .select(["> ._backdrop"], o => o
      .style({
        "display": `none`
      })
    )
    .select(["&[sd-toggle=true]"], o => o
      .style({
        "padding-left": `0`,
        "transition": `padding-left .1s ease-in`
      })
      .select(["> sd-sidebar"], o => o
        .style({
          "transform": `translateX(-100%)`,
          "transition": `transform .1s ease-in`
        })
      )
    )
    .select([`@media ${s.vars.media.mobile}`], o => o
      .style({
        "padding-left": `0`,
        "transition": `none`
      })
      .select(["> sd-sidebar"], o => o
        .style({
          "transform": `translateX(-100%)`,
          "transition": `transform .1s ease-in`
        })
      )
      .select(["&[sd-toggle=true]"], o => o
        .select(["> sd-sidebar"], o => o
          .style({
            "transform": `none`,
            "transition": `transform .1s ease-out`
          })
        )
        .select(["> ._backdrop"], o => o
          .style({
            "display": `block`,
            "position": `absolute`,
            "z-index": `${s.vars.zIndex.sidebar - 1}`,
            "top": `0`,
            "left": `0`,
            "width": `100%`,
            "height": `100%`,
            "background": `rgba(0, 0, 0, .6)`
          })
        )
      )
    )
  );
