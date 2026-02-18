import { c as N, b as m, S as x, u as C, a as E } from "./atoms.css-WCFmS3R-.js";
import {
  f,
  g as I,
  c as s,
  j as v,
  m as w,
  i as u,
  a as R,
  b,
  t as h,
  e as T,
  w as V,
  p as H,
  F as M,
  o as P,
  k as y,
} from "./index-DaQvuWeP.js";
/* empty css                              */ import {
  c as $,
  L as k,
  a as j,
} from "./list-item-TR_b4pbw.js";
import { M as B } from "./constants-Bbx-VEQM.js";
var ee = N("outline", "home", "Home", [
    ["path", { d: "M5 12l-2 0l9 -9l9 9l-2 0" }],
    ["path", { d: "M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7" }],
    ["path", { d: "M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6" }],
  ]),
  K = m({
    defaultClassName: "_16d8tmp0",
    variantClassNames: {},
    defaultVariants: {},
    compoundVariants: [],
  }),
  U = m({
    defaultClassName: "_16d8tmp1",
    variantClassNames: { toggled: { true: "_16d8tmp2", false: "_16d8tmp3" } },
    defaultVariants: {},
    compoundVariants: [],
  }),
  F = h("<div><div>");
const te = (e) => {
  const [t, l] = f(e, ["toggled", "onToggledChange", "width", "class", "style", "children"]),
    [a, d] = I(!1),
    r = () => t.toggled ?? a(),
    c = (o) => {
      (t.toggled === void 0 && d(o), t.onToggledChange?.(o));
    },
    n = () => c(!r()),
    i = () => t.width ?? "16rem",
    g = { toggled: r, setToggled: c, toggle: n, width: i },
    L = () => {
      c(!1);
    };
  return s(x.Provider, {
    value: g,
    get children() {
      var o = F(),
        p = o.firstChild;
      return (
        v(
          o,
          w(l, {
            get class() {
              return [K(), t.class].filterExists().join(" ");
            },
            get style() {
              return $(t.style, { "padding-left": r() ? "0" : i() });
            },
          }),
          !1,
          !0,
        ),
        (p.$$click = L),
        u(o, () => t.children, null),
        R(() => b(p, U({ toggled: r() }))),
        o
      );
    },
  });
};
T(["click"]);
var O = m({
    defaultClassName: "_1phd8hc0",
    variantClassNames: { toggled: { false: "_1phd8hc1", true: "_1phd8hc2" } },
    defaultVariants: { toggled: !1 },
    compoundVariants: [],
  }),
  W = h("<aside>");
const ae = (e) => {
  const [t, l] = f(e, ["class", "style", "children"]),
    { toggled: a, width: d } = C();
  return (() => {
    var r = W();
    return (
      v(
        r,
        w(l, {
          get class() {
            return [O({ toggled: a() }), t.class].filterExists().join(" ");
          },
          get style() {
            return $(t.style, { width: d() });
          },
        }),
        !1,
        !0,
      ),
      u(r, () => t.children),
      r
    );
  })();
};
var A = "_62y5r40",
  X = "_62y5r41",
  q = "_62y5r42";
function _(e) {
  const t = window.location.hash;
  return t === "#/" || t.startsWith("#/")
    ? `${window.location.origin + window.location.pathname + window.location.search}#${e}`
    : new URL(e, window.location.origin).href;
}
var z = h("<nav><div>MENU"),
  D = h("<div>");
const ne = (e) => {
    const [t, l] = f(e, ["menus", "layout"]),
      a = V(() => (t.layout !== void 0 ? t.layout : t.menus.length <= 3 ? "flat" : "accordion")),
      { setToggled: d } = C(),
      r = H(),
      c = (n, i) => {
        if (n.path != null) {
          if (n.path.includes("://")) {
            window.open(n.path, "_blank");
            return;
          }
          if (i.ctrlKey || i.altKey) {
            window.open(_(n.path), "_blank");
            return;
          }
          if (i.shiftKey) {
            window.open(_(n.path), "_blank", "width=800,height=800");
            return;
          }
          (r(n.path), window.innerWidth <= B && d(!1));
        }
      };
    return (() => {
      var n = z(),
        i = n.firstChild;
      return (
        v(
          n,
          w(l, {
            get class() {
              return [A, l.class].filterExists().join(" ");
            },
          }),
          !1,
          !0,
        ),
        b(i, X),
        u(
          n,
          s(k, {
            inset: !0,
            class: q,
            get children() {
              return s(M, {
                get each() {
                  return t.menus;
                },
                children: (g) =>
                  s(S, {
                    menu: g,
                    depth: 0,
                    get layout() {
                      return a();
                    },
                    onMenuClick: c,
                  }),
              });
            },
          }),
          null,
        ),
        n
      );
    })();
  },
  S = (e) => {
    const t = P(),
      l = () => (e.menu.children?.length ?? 0) > 0;
    return s(j, {
      get layout() {
        return e.layout;
      },
      get selected() {
        return t.pathname === e.menu.path;
      },
      get style() {
        return {
          "text-indent": `${e.parentLayout === "accordion" && e.depth !== 0 ? (e.depth + 1) * 0.5 : 0}rem`,
        };
      },
      get class() {
        return E({ gap: "xs" });
      },
      onClick: (a) => e.onMenuClick(e.menu, a),
      get children() {
        return [
          s(y, {
            get when() {
              return e.menu.icon;
            },
            keyed: !0,
            children: (a) => a({}),
          }),
          (() => {
            var a = D();
            return (u(a, () => e.menu.title), a);
          })(),
          s(y, {
            get when() {
              return l();
            },
            get children() {
              return s(k, {
                inset: !0,
                get children() {
                  return s(M, {
                    get each() {
                      return e.menu.children;
                    },
                    children: (a) =>
                      s(S, {
                        menu: a,
                        get depth() {
                          return e.depth + 1;
                        },
                        layout: "accordion",
                        get parentLayout() {
                          return e.layout;
                        },
                        get onMenuClick() {
                          return e.onMenuClick;
                        },
                      }),
                  });
                },
              });
            },
          }),
        ];
      },
    });
  };
export { ee as I, ae as S, ne as a, te as b, _ as c };
