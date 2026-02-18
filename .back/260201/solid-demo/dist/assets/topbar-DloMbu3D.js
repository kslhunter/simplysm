import {
  f as l,
  j as i,
  m as c,
  i as o,
  t as u,
  q as h,
  c as n,
  k as m,
} from "./index-DaQvuWeP.js";
import { S as d } from "./atoms.css-WCFmS3R-.js";
import { B as f, I as C } from "./IconMenu2-BvvTiCnB.js";
var v = "_1y7p4tx0",
  x = u("<div>");
const $ = (s) => {
  const [e, a] = l(s, ["class", "children"]);
  return (() => {
    var r = x();
    return (
      i(
        r,
        c(a, {
          get class() {
            return [v, e.class].filterExists().join(" ");
          },
        }),
        !1,
        !0,
      ),
      o(r, () => e.children),
      r
    );
  })();
};
var T = "_1i80cku0",
  b = u("<header>");
const j = (s) => {
  const [e, a] = l(s, ["class", "children", "showToggle"]),
    r = h(d),
    p = () => e.showToggle ?? !!r,
    g = () => {
      r?.toggle();
    };
  return (() => {
    var t = b();
    return (
      i(
        t,
        c(a, {
          get class() {
            return [T, e.class].filterExists().join(" ");
          },
        }),
        !1,
        !0,
      ),
      o(
        t,
        n(m, {
          get when() {
            return p();
          },
          get children() {
            return n(f, {
              link: !0,
              size: "sm",
              onClick: g,
              get children() {
                return n(C, { size: 20 });
              },
            });
          },
        }),
        null,
      ),
      o(t, () => e.children, null),
      t
    );
  })();
};
export { j as T, $ as a };
