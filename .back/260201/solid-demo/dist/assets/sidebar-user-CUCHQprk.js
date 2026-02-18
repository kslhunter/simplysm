import {
  f,
  g as C,
  j as $,
  m as _,
  h as b,
  b as n,
  i as t,
  c as r,
  a as p,
  k as S,
  F as U,
  t as m,
  e as k,
} from "./index-DaQvuWeP.js";
import { c as x, a as u, r as E } from "./atoms.css-WCFmS3R-.js";
import { L, a as M, C as j } from "./list-item-TR_b4pbw.js";
var w = x("outline", "user", "User", [
    ["path", { d: "M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" }],
    ["path", { d: "M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" }],
  ]),
  z = "iphec80",
  F = "iphec81",
  I = "iphec82",
  O = m("<div>"),
  P = m("<div><div><div></div><div><div>");
const q = (h) => {
  const [s, o] = f(h, ["menus", "name", "description"]),
    [v, g] = C(!1);
  return (() => {
    var a = P(),
      i = a.firstChild,
      l = i.firstChild,
      c = l.nextSibling,
      d = c.firstChild;
    return (
      $(
        a,
        _(o, {
          get class() {
            return [z, o.class].filterExists().join(" ");
          },
        }),
        !1,
        !0,
      ),
      b(E, i, () => !0),
      (i.$$click = () => g((e) => !e)),
      n(i, F),
      n(l, I),
      t(l, r(w, { size: 20 })),
      t(d, () => s.name),
      t(
        c,
        r(S, {
          get when() {
            return s.description;
          },
          get children() {
            var e = O();
            return (
              t(e, () => s.description),
              p(() => n(e, u({ fontSize: "sm", color: "muted" }))),
              e
            );
          },
        }),
        null,
      ),
      t(
        a,
        r(j, {
          get open() {
            return v();
          },
          get children() {
            return r(L, {
              inset: !0,
              get children() {
                return r(U, {
                  get each() {
                    return s.menus;
                  },
                  children: (e) =>
                    r(M, {
                      get onClick() {
                        return e.onClick;
                      },
                      get children() {
                        return e.title;
                      },
                    }),
                });
              },
            });
          },
        }),
        null,
      ),
      p(() => n(d, u({ fontWeight: "bold" }))),
      a
    );
  })();
};
k(["click"]);
export { q as S };
