import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdDropdownPopup = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-dropdown-popup"], o => o
    .style({
      "position": "fixed",
      "z-index": `${s.vars.zIndex.dropdown}`,
      "opacity": "0",
      "transform": "translateY(-10px)",
      "transition": ".1s linear",
      "transition-property": "transform, opacity",
      "pointer-events": "none",
      "background": "white",
      "min-width": "120px",
      "max-height": "300px",
      "overflow": "auto",
      ...s.mixins.elevation(6)
    })
    .select(["&:focus"], o => o
      .style({
        "outline": `1px solid ${s.vars.themeColor.primary.default}`
      })
    )
  );
