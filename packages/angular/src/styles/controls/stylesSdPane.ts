import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdPane = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-pane"], o => o
    .style({
      "display": `block`,
      "width": `100%`,
      "height": `100%`,
      "overflow": `auto`
    })
  );
