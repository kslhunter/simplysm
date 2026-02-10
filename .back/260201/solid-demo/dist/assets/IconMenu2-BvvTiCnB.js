import { f as n, h as p, j as i, m as l, i as b, t as u } from "./index-DaQvuWeP.js";
import { b as m, o, r as c, c as h } from "./atoms.css-WCFmS3R-.js";
var t = m({
    defaultClassName: "b62p5a0",
    variantClassNames: {
      theme: {
        primary: "b62p5a1",
        secondary: "b62p5a2",
        success: "b62p5a3",
        warning: "b62p5a4",
        danger: "b62p5a5",
        info: "b62p5a6",
        gray: "b62p5a7",
        slate: "b62p5a8",
      },
      link: { true: "b62p5a9" },
      inset: { true: "b62p5aa" },
      size: { xs: "b62p5ab", sm: "b62p5ac", base: "b62p5ad", lg: "b62p5ae", xl: "b62p5af" },
    },
    defaultVariants: {},
    compoundVariants: [
      [{ theme: "primary", link: !0 }, "b62p5ag"],
      [{ theme: "secondary", link: !0 }, "b62p5ah"],
      [{ theme: "success", link: !0 }, "b62p5ai"],
      [{ theme: "warning", link: !0 }, "b62p5aj"],
      [{ theme: "danger", link: !0 }, "b62p5ak"],
      [{ theme: "info", link: !0 }, "b62p5al"],
      [{ theme: "gray", link: !0 }, "b62p5am"],
      [{ theme: "slate", link: !0 }, "b62p5an"],
    ],
  }),
  d = u("<button>");
const g = (r) => {
  const [e, s] = n(r, [...t.variants(), "class", "children"]);
  return (() => {
    var a = d();
    return (
      p(c, a, () => !0),
      i(
        a,
        l(s, {
          get class() {
            return [t(o(e, t.variants())), e.class].filterExists().join(" ");
          },
        }),
        !1,
        !0,
      ),
      b(a, () => e.children),
      a
    );
  })();
};
var v = h("outline", "menu-2", "Menu2", [
  ["path", { d: "M4 6l16 0" }],
  ["path", { d: "M4 12l16 0" }],
  ["path", { d: "M4 18l16 0" }],
]);
export { g as B, v as I };
