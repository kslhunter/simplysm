import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdSheet = (s: SdStylePresets) => {
  const paddingV = s.vars.sheetPaddingV;
  const paddingH = s.vars.sheetPaddingH;
  const rowHeight = Math.floor(s.fns.stripUnit(paddingV) * 2 + s.fns.stripUnit(s.vars.lineHeight) * s.fns.stripUnit(s.vars.fontSize.default)) + "px";
  const editCellBackground = s.vars.themeColor.secondary;

  return new SdStyleBuilder()
    .select(["sd-sheet"], o => o
      .style({
        "display": `block`,
        "position": `relative`,
        "width": `100%`,
        "max-height": `100%`,
        "overflow": `auto`,
        "background": `${s.vars.bgColor}`,
        "z-index": `0`
      })
      .select(["._content"], o => o
        .style({
          "white-space": `nowrap`,
          "width": `fit-content`
        })
      )
      .select(["._head"], o => o
        .style({
          "display": `block`,
          "position": `absolute`,
          "z-index": `2`,
          "top": `0`,
          "left": `0`,
          "white-space": `nowrap`,
          "border-bottom": `1px solid ${s.vars.themeColor.grey.light}`
        })
      )
      .select(["._col-group"], o => o
        .style({
          "display": `inline-block`
        })
      )
      .select(["._col"], o => o
        .style({
          "position": `relative`,
          "display": `inline-block`,
          "vertical-align": `top`,
          "height": `${s.fns.stripUnit(rowHeight) + 1}px`
        })
        .select(["&:focus"], o => o
          .style({
            "outline-color": `transparent`
          })
        )
      )
      .select(["._head ._col"], o => o
        .style({
          "background": `${s.vars.themeColor.grey.lighter}`,
          "text-align": `center`,
          "padding": `${paddingV} ${paddingH}`,
          "border-bottom": `1px solid ${s.vars.themeColor.grey.light}`,
          "user-select": `none`
        })
        .select(["> ._border"], o => o
          .style({
            "position": `absolute`,
            "top": `0`,
            "right": `0`,
            "bottom": `0`,
            "width": `4px`,
            "border-right": `1px solid ${s.vars.themeColor.grey.light}`
          })
        )
      )
      .select(["._body ._col"], o => o
        .style({
          "background": `white`,
          "border-right": `1px solid ${s.vars.themeColor.grey.light}`,
          "border-bottom": `1px solid ${s.vars.themeColor.grey.light}`
        })
        .select(["sd-textfield > input"], o => o
          .style({
            "border": `none`,
            "padding": `${paddingV} ${paddingH}`,
            "background": `${editCellBackground.lightest}`
          })
          .select(["&[type=year]", "&[type=month]", "&[type=date]", "&[type=datetime]", "&[type=time]", "&[type=datetime-local]"], o => o
            .style({
              "padding": `${s.fns.stripUnit(paddingV) - 1}px ${paddingH}`
            })
          )
          .select(["&[type=color]"], o => o
            .style({
              "height": `${Math.floor(s.fns.stripUnit(paddingV) * 2 + s.fns.stripUnit(s.vars.lineHeight) * s.fns.stripUnit(s.vars.fontSize.default))}px`
            })
          )
          .select(["&:disabled"], o => o
            .style({
              "background": `transparent`,
              "color": `${s.vars.textColor.default}`
            })
          )
        )
        .select(["sd-combobox"], o => o
          .select(["> ._icon"], o => o
            .style({
              "top": `0`,
              "right": `0`,
              "width": `${rowHeight}`,
              "padding": `${paddingV} 0`
            })
          )
          .select(["> sd-textfield > input"], o => o
            .style({
              "padding-right": `${rowHeight}`
            })
          )
        )
        .select(["sd-checkbox > label"], o => o
          .style({
            "display": `inline-block`,
            "width": `auto`,
            "border": `none`,
            "padding": `${paddingV} ${paddingH}`
          })
          .select(["> ._indicator_rect"], o => o
            .style({
              "background": `${editCellBackground.lightest}`
            })
          )
          .select(["> input:disabled + ._indicator_rect"], o => o
            .style({
              "background": `transparent`
            })
          )
        )
        .select(["sd-button > button"], o => o
          .style({
            "border": `none`,
            "padding": `${paddingV} ${paddingH}`,
            "text-align": `left`
          })
        )
        .select(["sd-select", "sd-multi-select"], o => o
          .select(["> sd-dropdown > div"], o => o
            .style({
              "border": `none`,
              "padding": `${paddingV} ${paddingH}`,
              "height": `${rowHeight}`,
              "background": `${editCellBackground.lightest}`,
              "border-radius": `0`
            })
            .select(["> ._icon"], o => o
              .style({
                "top": `0`,
                "right": `0`,
                "width": `${rowHeight}`,
                "padding": `${paddingV} 0`
              })
            )
          )
          .select(["&[sd-disabled=true] > sd-dropdown > div"], o => o
            .style({
              "background": `transparent`,
              "color": `${s.vars.textColor.default}`
            })
            .select(["> ._icon"], o => o
              .style({
                "display": `none`
              })
            )
          )
        )
        .select(["> ._focus-indicator"], o => o
          .style({
            "position": `absolute`,
            "opacity": `0`,
            "top": `0`,
            "left": `0`,
            "width": `100%`,
            "height": `100%`,
            "outline": `2px solid ${s.vars.themeColor.primary.default}`,
            "outline-offset": `-2px`,
            "pointer-events": `none`,
            "transition": `opacity .1s linear`
          })
        )
        .select(["&:focus"], o => o
          .style({
            "z-index": `3`
          })
        )
        .select(["&:focus > ._focus-indicator"], o => o
          .style({
            "opacity": `1`
          })
        )
      )
      .select(["._head ._col._first-col", "._body ._col._first-col"], o => o
        .style({
          "width": `${rowHeight}`,
          "text-align": `center`,
          "padding": `${paddingV}`
        })
      )
      .select(["._body ._col._first-col"], o => o
        .style({
          "background": `${s.vars.themeColor.grey.lighter}`
        })
      )
      .select(["._fixed-col-group"], o => o
        .style({
          "position": `absolute`,
          "z-index": `1`,
          "top": `0`,
          "left": `0`,
          "border-right": `1px solid ${s.vars.themeColor.grey.light}`
        })
      )
      .select(["._row"], o => o
        .style({
          "position": `relative`
        })
      )
      .select(["&[sd-selectable=true] ._body ._first-col"], o => o
        .style({
          "cursor": `pointer`
        })
      )
    );
};
