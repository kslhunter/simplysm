import {SdStylePresets} from "../style/SdStylePresets";
import {SdStyleBuilder} from "../style/SdStyleBuilder";

//tslint:disable:no-shadowed-variable
export const stylesClasses = (s: SdStylePresets) => new SdStyleBuilder()
  .forEach(Object.keys(s.vars.themeColor), (o, key) => o
    .forEach(Object.keys(s.vars.themeColor[key]), (o, key1) => o
      .select([`.sd-background-${key}-${key1}`], o => o
        .style({
          "background": `${s.vars.themeColor[key][key1]} !important`
        })
        .if(key1 !== "lighter" && key1 !== "lightest", o => o
          .style({
            "color": s.vars.textReverseColor.default
          })
          .select(["a"], o => o
            .style({
              "color": s.vars.textReverseColor.dark
            })
            .select(["&:hover", "&:focus"], o => o
              .style({
                "color": s.vars.textReverseColor.default
              })
            )
          )
          .select(["sd-textfield > input"], o => o
            .style({
              "background": `${s.vars.transColor.light} !important`,
              "color": "white !important",
              "border-color": `${s.vars.transColor.light} !important`
            })
          )
          .select(["sd-list-item[sd-header=true] > label"], o => o
            .style({
              "color": `${s.vars.textReverseColor.dark} !important`
            })
          )
          .select(["sd-list-item > ._child > ._child-content"], o => o
            .style({
              "background": "rgba(0, 0, 0, .2)"
            })
            .select(["sd-list-item > label"], o => o
              .style({
                "opacity": ".8"
              })
              .select(["&:hover"], o => o
                .style({
                  "opacity": "1"
                })
              )
            )
          )
          .select(["sd-checkbox"], o => o
            .select(["> label"], o => o
              .style({
                "color": `${s.vars.textReverseColor.default} !important`
              })
              .select(["> ._indicator_rect"], o => o
                .style({
                  "background": `${s.vars.transColor.light} !important`,
                  "border-color": `${s.vars.transColor.light} !important`
                })
              )
              .select(["> ._indicator"], o => o
                .style({
                  "color": `${s.vars.textReverseColor.default} !important`
                })
              )
              .select(["&[sd-radio=true] > label > ._indicator > div"], o => o
                .style({
                  "background": `${s.vars.textReverseColor.default} !important`
                })
              )
            )
          )
        )
      )
    )
  )
  .select([".sd-background-white"], o => o
    .style({
      "background": "white !important"
    })
  )
  .select([".sd-background-default"], o => o
    .style({
      "background": `${s.vars.bgColor} !important`
    })
  )
  .forEach(Object.keys(s.vars.fontSize), (o, key) => o
    .select([`.sd-font-size-${key}`], o => o
      .style({
        "font-size": `${s.vars.fontSize[key]} !important`
      })
    )
  )
  .forEach(Object.keys(s.vars.themeColor), (o, key) => o
    .forEach(Object.keys(s.vars.themeColor[key]), (o, key1) => o
      .select([`.sd-text-color-${key}-${key1}`], o => o
        .style({
          "color": `${s.vars.themeColor[key][key1]} !important`
        })
      )
    )
  )
  .select([".sd-text-reverse-color-dark"], o => o
    .style({
      "color": `${s.vars.textReverseColor.dark} !important`
    })
  )
  .forEach(Object.keys(s.vars.textColor), (o, key) => o
    .select([`sd-text-color-${key}`], o => o
      .style({
        "color": `${s.vars.textColor[key]} !important`
      })
    )
  )
  .forEach(["top", "right", "bottom", "left"], (o, direction) => o
    .forEach(Object.keys(s.vars.themeColor), (o, key) => o
      .forEach(Object.keys(s.vars.themeColor[key]), (o, key1) => o
        .select([`sd-border-${direction}-${key}-${key1}`], o => {
          const obj: any = {};
          obj[`border-${direction}`] = `1px solid ${s.vars.themeColor[key][key1]}`;
          return o.style(obj);
        })
      )
    )
    .forEach(Object.keys(s.vars.transColor), (o, key) => o
      .select([`.sd-border-${direction}-${key}`], o => {
        const obj: any = {};
        obj[`border-${direction}`] = `1px solid ${s.vars.transColor[key]}`;
        return o.style(obj);
      })
    )
    .select([`.sd-border-${direction}-none`], o => {
      const obj: any = {};
      obj[`border-${direction}`] = `none !important`;
      return o.style(obj);
    })
  )
  .forEach(Object.keys(s.vars.themeColor), (o, key) => o
    .forEach(Object.keys(s.vars.themeColor[key]), (o, key1) => o
      .select([`.sd-border-${key}-${key1}`], o => o
        .style({
          "border": `1px solid ${s.vars.themeColor[key][key1]}`
        })
      )
    )
  )
  .forEach(Object.keys(s.vars.transColor), (o, key) => o
    .select([`.sd-border-${key}`], o => o
      .style({
        "border": `1px solid ${s.vars.transColor[key]}`
      })
    )
  )
  .forEach(Object.keys(s.vars.gap), (o, key) => o
    .select([`.sd-padding-${key}`], o => o
      .style({
        "padding": s.vars.gap[key]
      })
    )
    .forEach(Object.keys(s.vars.gap), (o, key1) => o
      .select([`.sd-padding-${key}-${key1}`], o => o
        .style({
          "padding": `${s.vars.gap[key]} ${s.vars.gap[key1]}`
        })
      )
    )
    .forEach(["top", "right", "bottom", "left"], (o, direction) => o
      .select([`.sd-padding-${direction}-${key}`], o => {
        const obj: any = {};
        obj[`padding-${direction}`] = s.vars.gap[key];
        return o.style(obj);
      })
    )
  )
  .forEach(Object.keys(s.vars.gap), (o, key) => o
    .select([`.sd-margin-${key}`], o => o
      .style({
        "margin": s.vars.gap[key]
      })
    )
    .forEach(["top", "right", "bottom", "left"], (o, direction) => o
      .select([`.sd-margin-${direction}-${key}`], o => {
        const obj: any = {};
        obj[`margin-${direction}`] = s.vars.gap[key];
        return o.style(obj);
      })
    )
  );
