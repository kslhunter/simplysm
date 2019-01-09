import {SdStylePresets} from "../style/SdStylePresets";
import {SdStyleBuilder} from "../style/SdStyleBuilder";

//tslint:disable:no-shadowed-variable
export const stylesDefaults = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["*", "*:after", "*.before"], o => o
    .style({
      "box-sizing": "border-box"
    })
  )
  .select(["*:focus"], o => o
    .style({
      "outline-color": s.vars.themeColor.primary.default
    })
  )
  .select(["html", "body"], o => o
    .style({
      "height": "100%",
      "width": "100%",
      "padding": "0",
      "margin": "0"
    })
  )
  .select(["body"], o => o
    .style({
      "background": s.vars.bgColor,
      "color": s.vars.textColor.default,
      "font-family": s.vars.fontFamily,
      "font-size": s.vars.fontSize.default,
      "line-height": s.vars.lineHeight
    })
  )
  .select(["pre", "code"], o => o
    .style({
      "font-family": s.vars.fontFamily,
      "font-size": s.vars.fontSize.default,
      "line-height": s.vars.lineHeight,
      "margin": "0"
    })
  )
  .select(["code"], o => o
    .style({
      "font-family": s.vars.fontFamilyMonospace
    })
  )
  .forEach([1, 2, 3, 4, 5, 6], (o, num) => o
    .select([`h${num}`], o => o
      .style({
        "font-size": s.vars.fontSize["h" + num],
        "line-height": s.vars.lineHeight,
        "margin": "0"
      })
    )
  )
  .select(["a"], o => o
    .style({
      "display": "inline-block",
      "cursor": "pointer",
      "color": s.vars.themeColor.primary.default
    })
    .select(["&:focus"], o => o
      .style({
        "outline-color": "transparent"
      })
    )
    .select(["&:hover", "&:focus"], o => o
      .style({
        "color": s.vars.themeColor.primary.dark
      })
    )
  )
  .select(["::-webkit-scrollbar-track"], o => o
    .style({
      "background-color": `rgba(${s.vars.themeColor.grey.darker}, .1)`
    })
  )
  .select(["::-webkit-scrollbar-corner"], o => o
    .style({
      "background-color": `rgba(${s.vars.themeColor.grey.light}, .1)`
    })
  )
  .select(["::-webkit-scrollbar"], o => o
    .style({
      "width": "8px",
      "height": "8px",
      "background-color": "rgba(0, 0, 0, 0)"
    })
  )
  .select(["::-webkit-scrollbar-thumb"], o => o
    .style({
      "background-color": `rgba(${s.vars.themeColor.grey.darker}, .15)`
    })
  );
