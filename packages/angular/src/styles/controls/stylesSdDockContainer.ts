import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdDockContainer = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-dock-container"], o => o
    .style({
      "display": "block",
      "position": "relative",
      "width": "100%",
      "height": "100%",
      "overflow": "auto"
    })
  );
