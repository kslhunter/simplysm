import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdFormItem = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-form-item"], o => o
    .style({
      "display": "block",
      "margin-bottom": s.vars.gap.default
    })
    .select(["&:last-child"], o => o
      .style({
        "margin-bottom": "0"
      })
    )
    .select(["> label"], o => o
      .style({
        "display": "block",
        "font-weight": "bold",
        "margin-bottom": s.vars.gap.xs
      })
    )
  );
