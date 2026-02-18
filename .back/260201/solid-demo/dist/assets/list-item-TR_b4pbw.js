import {
  x as B,
  y as K,
  f as k,
  g as w,
  z as Y,
  j as C,
  m as P,
  i as g,
  t as A,
  h as V,
  e as U,
  A as Z,
  w as H,
  d as j,
  b as S,
  c as y,
  n as q,
  k as I,
  a as ee,
  l as z,
  B as te,
} from "./index-DaQvuWeP.js";
import {
  c as se,
  b as E,
  f as ne,
  d as ae,
  e as re,
  h as oe,
  o as R,
  a as T,
  r as le,
} from "./atoms.css-WCFmS3R-.js";
import { t as ie } from "./token.css-Cwc-7hPJ.js";
var ce = se("outline", "chevron-left", "ChevronLeft", [["path", { d: "M15 6l-6 6l6 6" }]]),
  O = E({
    defaultClassName: "_1m60fyb0",
    variantClassNames: { open: { true: "_1m60fyb1", false: "_1m60fyb2" } },
    defaultVariants: {},
    compoundVariants: [],
  });
function de(r, e) {
  const a = new ResizeObserver(r);
  return (
    K(a.disconnect.bind(a)),
    { observe: (c) => a.observe(c, e), unobserve: a.unobserve.bind(a) }
  );
}
function ue(r, e, a) {
  const c = new WeakMap(),
    { observe: i, unobserve: b } = de((h) => {
      for (const d of h) {
        const { contentRect: t, target: s } = d,
          f = Math.round(t.width),
          n = Math.round(t.height),
          l = c.get(s);
        (!l || l.width !== f || l.height !== n) && (e(t, s, d), c.set(s, { width: f, height: n }));
      }
    }, a);
  B((h) => {
    const d = ne(ae(re(r)));
    return (oe(d, h, i, b), d);
  }, []);
}
var fe = A("<div><div>");
const pe = (r) => {
  const [e, a, c] = k(r, [...O.variants(), "children"], ["class", "style"]);
  let i;
  const [b, h] = w(!1),
    [d, t] = w(e.open ? "auto" : "0px"),
    [s, f] = w("0px");
  return (
    Y(() => {
      (f(`${i.scrollHeight}px`),
        e.open && t(`${i.scrollHeight}px`),
        ue(i, () => {
          f(`${i.scrollHeight}px`);
        }));
      const n = requestAnimationFrame(() => h(!0));
      K(() => cancelAnimationFrame(n));
    }),
    B(() => {
      b() && t(e.open ? s() : "0px");
    }),
    (() => {
      var n = fe(),
        l = n.firstChild;
      C(
        n,
        P(
          {
            get "class"() {
              return O(R(e, O.variants()));
            },
            get "style"() {
              return { height: d() };
            },
            get "data-collapsed"() {
              return e.open ? void 0 : "";
            },
          },
          c,
        ),
        !1,
        !0,
      );
      var p = i;
      return (
        typeof p == "function" ? V(p, l) : (i = l),
        C(l, a, !1, !0),
        g(l, () => e.children),
        n
      );
    })()
  );
};
var _ = E({
  defaultClassName: "lqbmze0",
  variantClassNames: { open: { true: "lqbmze1", false: "lqbmze2" } },
  defaultVariants: {},
  compoundVariants: [],
});
const he = /((?:--)?(?:\w+-?)+)\s*:\s*([^;]*)/g;
function F(r) {
  const e = {};
  let a;
  for (; (a = he.exec(r)); ) e[a[1]] = a[2];
  return e;
}
function W(r, e) {
  if (typeof r == "string") {
    if (typeof e == "string") return `${r};${e}`;
    r = F(r);
  } else typeof e == "string" && (e = F(e));
  return { ...r, ...e };
}
var me = A("<span>");
const ve = (r) => {
  const [e, a] = k(r, [..._.variants(), "icon", "openRotate", "style", "class"]),
    c = () => (e.open ? (e.openRotate ?? 90) : 0);
  return (() => {
    var i = me();
    return (
      C(
        i,
        P(a, {
          get class() {
            return [_(R(e, _.variants())), e.class].filterExists().join(" ");
          },
          get style() {
            return W(e.style, { transform: `rotate(${c()}deg)` });
          },
        }),
        !1,
        !0,
      ),
      g(i, () => e.icon({})),
      i
    );
  })();
};
var $ = E({
    defaultClassName: "_7knhmm0",
    variantClassNames: { inset: { true: "_7knhmm1" } },
    defaultVariants: {},
    compoundVariants: [],
  }),
  ge = A("<div role=tree>");
const we = (r) => {
  const [e, a] = k(r, [...$.variants(), "class", "children"]);
  let c;
  const i = (t) => {
      let s = t.parentElement;
      for (; s && s !== c; ) {
        if (s.hasAttribute("data-collapsed")) return !1;
        s = s.parentElement;
      }
      return !0;
    },
    b = (t) => {
      const s = t.getAttribute("aria-expanded") === "true";
      t.hasAttribute("aria-expanded") &&
        (s
          ? t.parentElement
              ?.querySelector(
                ":scope > [data-collapsed] [data-list-item], :scope > * > [data-list-item]",
              )
              ?.focus()
          : t.click());
    },
    h = (t) => {
      const s = t.getAttribute("aria-expanded") === "true";
      t.hasAttribute("aria-expanded") && s
        ? t.click()
        : t.parentElement?.parentElement?.closest("[data-list-item]")?.focus();
    },
    d = (t) => {
      const s = t.target;
      if (!s.hasAttribute("data-list-item")) return;
      const n = [...c.querySelectorAll('[data-list-item]:not([aria-disabled="true"])')].filter(
          (p) => i(p),
        ),
        l = n.indexOf(s);
      switch (t.key) {
        case " ":
        case "Enter":
          (t.preventDefault(), t.stopPropagation(), s.click());
          break;
        case "ArrowDown":
          l + 1 < n.length && (t.preventDefault(), t.stopPropagation(), n[l + 1]?.focus());
          break;
        case "ArrowUp":
          l - 1 >= 0 && (t.preventDefault(), t.stopPropagation(), n[l - 1]?.focus());
          break;
        case "Home":
          n.length > 0 && l !== 0 && (t.preventDefault(), t.stopPropagation(), n[0]?.focus());
          break;
        case "End":
          n.length > 0 &&
            l !== n.length - 1 &&
            (t.preventDefault(), t.stopPropagation(), n[n.length - 1]?.focus());
          break;
        case "ArrowRight":
          (t.preventDefault(), t.stopPropagation(), b(s));
          break;
        case "ArrowLeft":
          (t.preventDefault(), t.stopPropagation(), h(s));
          break;
      }
    };
  return (() => {
    var t = ge();
    t.$$keydown = d;
    var s = c;
    return (
      typeof s == "function" ? V(s, t) : (c = t),
      C(
        t,
        P(a, {
          get class() {
            return [$(R(e, $.variants())), e.class].filterExists().join(" ");
          },
        }),
        !1,
        !0,
      ),
      g(t, () => e.children),
      t
    );
  })();
};
U(["keydown"]);
var be = "u9cc9n0",
  N = E({
    defaultClassName: "u9cc9n1",
    variantClassNames: {
      layout: { accordion: "u9cc9n2", flat: "u9cc9n3" },
      selected: { true: "u9cc9n4" },
      disabled: { true: "u9cc9n5" },
      hasSelectedIcon: { true: "u9cc9n6" },
      hasChildren: { true: "u9cc9n7" },
    },
    defaultVariants: { layout: "accordion" },
    compoundVariants: [
      [{ layout: "flat", hasChildren: !0 }, "u9cc9n8"],
      [{ hasSelectedIcon: !0, selected: !0 }, "u9cc9n9"],
    ],
  }),
  ye = A("<div><div data-list-item role=treeitem tabindex=0><div>");
const $e = (r) => {
  const [e, a, c] = k(
      r,
      [...N.variants(), "open", "onOpenChange", "selectedIcon", "icon", "children"],
      ["class", "style"],
    ),
    [i, b] = w(e.open ?? !1),
    h = () => e.onOpenChange !== void 0,
    d = () => (h() ? (e.open ?? !1) : i()),
    t = (m) => {
      h() ? e.onOpenChange?.(m) : b(m);
    },
    s = Z(() => e.children),
    f = H(() => {
      const m = s.toArray();
      let u;
      const v = [];
      for (const o of m)
        o instanceof HTMLElement && o.classList.contains($.classNames.base) ? (u = o) : v.push(o);
      return { content: v, nestedList: u, hasChildren: u !== void 0 };
    }),
    n = () => f().content,
    l = () => f().nestedList,
    p = () => f().hasChildren,
    G = () => !e.disabled && !(e.layout === "flat" && p()),
    J = H(() => ({
      color: e.selected
        ? `rgb(${j.control.primary.base})`
        : `rgba(${j.text.base}, ${ie.overlay.base})`,
    })),
    Q = () => {
      e.disabled || t(!d());
    };
  return (() => {
    var m = ye(),
      u = m.firstChild,
      v = u.firstChild;
    return (
      S(m, be),
      C(m, c, !1, !0),
      u.addEventListener("focus", (o) => {
        (o.currentTarget
          .closest("[role='tree']")
          ?.querySelectorAll("[data-list-item]")
          .forEach((x) => {
            x.tabIndex = -1;
          }),
          (o.currentTarget.tabIndex = 0));
      }),
      (u.$$click = Q),
      V(le, u, () => G()),
      g(
        u,
        y(I, {
          get when() {
            return q(() => !!e.selectedIcon)() && !p();
          },
          get children() {
            return e.selectedIcon?.({ style: J() });
          },
        }),
        v,
      ),
      g(
        u,
        y(I, {
          get when() {
            return e.icon;
          },
          get children() {
            return e.icon?.({});
          },
        }),
        v,
      ),
      g(v, n),
      g(
        u,
        y(I, {
          get when() {
            return q(() => !!p())() && e.layout !== "flat";
          },
          get children() {
            return y(ve, {
              icon: ce,
              get open() {
                return d();
              },
              openRotate: -90,
            });
          },
        }),
        null,
      ),
      g(
        m,
        y(I, {
          get when() {
            return p();
          },
          get children() {
            return y(pe, {
              get open() {
                return e.layout === "flat" || d();
              },
              get class() {
                return T({ py: "xs" });
              },
              get children() {
                return l();
              },
            });
          },
        }),
        null,
      ),
      ee(
        (o) => {
          var L = N({ ...R(e, N.variants()), hasChildren: p(), hasSelectedIcon: !!e.selectedIcon }),
            x = p() ? d() : void 0,
            D = e.disabled || void 0,
            M = [T({ display: "flex", alignItems: "center" }), a.class].filterExists().join(" "),
            X = W(a.style, { flex: 1 });
          return (
            L !== o.e && S(u, (o.e = L)),
            x !== o.t && z(u, "aria-expanded", (o.t = x)),
            D !== o.a && z(u, "aria-disabled", (o.a = D)),
            M !== o.o && S(v, (o.o = M)),
            (o.i = te(v, X, o.i)),
            o
          );
        },
        { e: void 0, t: void 0, a: void 0, o: void 0, i: void 0 },
      ),
      m
    );
  })();
};
U(["click"]);
export { pe as C, we as L, $e as a, W as c };
