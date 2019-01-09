import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdSidebar = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-sidebar"], o => o
    .style({
      "display": `block`,
      "position": `absolute`,
      "z-index": `${s.vars.zIndex.sidebar}`,
      "top": `0`,
      "left": `0`,
      "width": `${s.vars.sidebarWidth}`,
      "height": `100%`,
      "background": `white`
    })
  );
