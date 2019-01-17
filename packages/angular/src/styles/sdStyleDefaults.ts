import {SdStyleBuilder} from "../commons/style/SdStyleBuilder";
import {SdStylePreset} from "../commons/style/SdStylePreset";

//tslint:disable:no-shadowed-variable
export const sdStyleDefaults = (s: SdStylePreset) => new SdStyleBuilder()
  .select(["*", "*:after", "*.before"], o => o
    .style({
      "box-sizing": "border-box"
    })
  )
  .select(["*:focus"], o => o
    .style({
      "outline-color": s.v.themeColor.primary.default
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
      "background": s.v.bgColor,
      "color": s.v.textColor.default,
      "font-family": s.v.fontFamily,
      "font-size": s.v.fontSize.default,
      "line-height": s.v.lineHeight
    })
  )
  .select(["pre", "code"], o => o
    .style({
      "font-family": s.v.fontFamily,
      "font-size": s.v.fontSize.default,
      "line-height": s.v.lineHeight,
      "margin": "0"
    })
  )
  .select(["code"], o => o
    .style({
      "font-family": s.v.fontFamilyMonospace
    })
  )
  .forEach([1, 2, 3, 4, 5, 6], (o, num) => o
    .select([`h${num}`], o => o
      .style({
        "font-size": s.v.fontSize["h" + num],
        "line-height": s.v.lineHeight,
        "margin": "0"
      })
    )
  )
  .select(["a"], o => o
    .style({
      "display": "inline-block",
      "cursor": "pointer",
      "color": s.v.themeColor.primary.default
    })
    .select(["&:focus"], o => o
      .style({
        "outline-color": "transparent"
      })
    )
    .select(["&:hover", "&:focus"], o => o
      .style({
        "color": s.v.themeColor.primary.dark
      })
    )
  )
  .select(["::-webkit-scrollbar-track"], o => o
    .style({
      "background-color": `rgba(${s.v.themeColor.grey.darker}, .1)`
    })
  )
  .select(["::-webkit-scrollbar-corner"], o => o
    .style({
      "background-color": `rgba(${s.v.themeColor.grey.light}, .1)`
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
      "background-color": `rgba(${s.v.themeColor.grey.darker}, .15)`
    })
  )
  .css;
