import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdTopbarMenu = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-topbar-menu"], o => o
    .style({
      "display": `block`,
      "padding": `0 ${s.vars.gap.default}`,
      "cursor": `pointer`,
      "transition": `.1s linear`,
      "transition-property": `background, color`,
      "user-select": `none`,
      "color": `${s.vars.topbarLinkColor}`,
      "float": `left`
    })
    .select(["&:hover"], o => o
      .style({
        "background": `${s.vars.transColor.dark}`,
        "color": `${s.vars.topbarLinkHoverColor}`
      })
    )
    .select(["&:active"], o => o
      .style({
        "transition": `none`,
        "background": `${s.vars.transColor.dark}`,
        "color": `${s.vars.topbarLinkHoverColor}`
      })
    )
    .select([`@media ${s.vars.media.mobile}`], o => o
      .style({
        "float": `right`
      })
    )
  );
