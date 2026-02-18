import {
  f as ge,
  g as W,
  h as ke,
  j as be,
  m as fe,
  b as r,
  i as n,
  c as e,
  k as pe,
  a as y,
  l as ne,
  t as P,
  n as te,
} from "./index-DaQvuWeP.js";
import { b as xe, c as ve, o as Se, r as Ce, a as s } from "./atoms.css-WCFmS3R-.js";
import { I as $e } from "./IconCheck-Cof-g2Mo.js";
import { T as _e, a as Ie } from "./topbar-DloMbu3D.js";
/* empty css                              */ import "./IconMenu2-BvvTiCnB.js";
var ye = "lskt4p0",
  we = "lskt4p1",
  ze = "lskt4p2",
  T = xe({
    defaultClassName: "lskt4p3",
    variantClassNames: {
      theme: {
        primary: "lskt4p4",
        secondary: "lskt4p5",
        success: "lskt4p6",
        warning: "lskt4p7",
        danger: "lskt4p8",
        info: "lskt4p9",
        gray: "lskt4pa",
        slate: "lskt4pb",
      },
      checked: { true: "lskt4pc", false: "lskt4pd" },
      indeterminate: { true: "lskt4pe", false: "lskt4pf" },
      size: { xs: "lskt4pg", sm: "lskt4ph", lg: "lskt4pi", xl: "lskt4pj" },
      inline: { true: "lskt4pk" },
      inset: { true: "lskt4pl" },
      disabled: { true: "lskt4pm" },
    },
    defaultVariants: { theme: "primary", checked: !1, indeterminate: !1 },
    compoundVariants: [],
  });
var De = ve("outline", "minus", "Minus", [["path", { d: "M5 12l14 0" }]]),
  Te = P(
    "<label><input type=checkbox style=position:absolute;opacity:0;pointer-events:none><span><span></span></span><span>",
  );
const t = (S) => {
  const [i, k] = ge(S, [
      ...T.variants(),
      "class",
      "children",
      "checked",
      "indeterminate",
      "onChange",
      "icon",
      "indeterminateIcon",
      "disabled",
    ]),
    [w, u] = W(i.checked ?? !1),
    C = () => i.onChange !== void 0,
    m = () => (C() ? (i.checked ?? !1) : w()),
    z = () => {
      const a = !m();
      C() ? i.onChange?.(a) : u(a);
    },
    b = () => {
      const a = i.icon ?? $e;
      return e(a, {});
    },
    $ = () => {
      const a = i.indeterminateIcon ?? De;
      return e(a, {});
    };
  return (() => {
    var a = Te(),
      g = a.firstChild,
      f = g.nextSibling,
      p = f.firstChild,
      c = f.nextSibling;
    return (
      ke(Ce, a, () => !0),
      be(
        a,
        fe(k, {
          get class() {
            return [
              T({
                ...Se(i, T.variants()),
                checked: m(),
                indeterminate: i.indeterminate ?? !1,
                disabled: i.disabled,
              }),
              i.class,
            ]
              .filter(Boolean)
              .join(" ");
          },
        }),
        !1,
        !0,
      ),
      g.addEventListener("change", z),
      r(f, ye),
      r(p, we),
      n(
        p,
        e(pe, {
          get when() {
            return i.indeterminate;
          },
          get fallback() {
            return e(b, {});
          },
          get children() {
            return e($, {});
          },
        }),
      ),
      r(c, ze),
      n(c, () => i.children),
      y(
        (d) => {
          var _ = i.disabled,
            h = String(m() && !i.indeterminate),
            v = String(i.indeterminate ?? !1);
          return (
            _ !== d.e && (g.disabled = d.e = _),
            h !== d.t && ne(p, "data-checked", (d.t = h)),
            v !== d.a && ne(p, "data-indeterminate", (d.a = v)),
            d
          );
        },
        { e: void 0, t: void 0, a: void 0 },
      ),
      y(() => (g.checked = m())),
      a
    );
  })();
};
var We = "c499dv0",
  Pe = P("<h1>Checkbox"),
  Le = P(
    "<div style=overflow:auto;flex:1><h2>Checkbox Demo</h2><section><h3>Default</h3><div></div></section><section><h3>Indeterminate</h3><div></div></section><section><h3>Theme</h3><div></div></section><section><h3>Size</h3><div></div></section><section><h3>Size + Theme</h3><div></div></section><section><h3>Theme + Disabled</h3><div></div></section><section><h3>Inline Variant (in Text)</h3><p>이 문장에서 <!> 체크박스가 텍스트와 함께 자연스럽게 표시됩니다.</p><p>여러 옵션을 선택할 수 있습니다: <!> <!> </p></section><section><h3>Inset Variant (in Table)</h3><table><tbody><tr><td></td><td>-</td><td></td><td>-</td><td></td><td>-</td><td>",
  );
function Ae() {
  const [S, i] = W(!1),
    [k, w] = W(!1);
  return e(Ie, {
    get children() {
      return [
        e(_e, {
          get children() {
            var u = Pe();
            return (y(() => r(u, s({ m: "none", fontSize: "base" }))), u);
          },
        }),
        (() => {
          var u = Le(),
            C = u.firstChild,
            m = C.nextSibling,
            z = m.firstChild,
            b = z.nextSibling,
            $ = m.nextSibling,
            a = $.firstChild,
            g = a.nextSibling,
            f = $.nextSibling,
            p = f.firstChild,
            c = p.nextSibling,
            d = f.nextSibling,
            _ = d.firstChild,
            h = _.nextSibling,
            v = d.nextSibling,
            le = v.firstChild,
            x = le.nextSibling,
            L = v.nextSibling,
            ie = L.firstChild,
            o = ie.nextSibling,
            V = L.nextSibling,
            re = V.firstChild,
            D = re.nextSibling,
            ae = D.firstChild,
            j = ae.nextSibling;
          j.nextSibling;
          var I = D.nextSibling,
            ce = I.firstChild,
            E = ce.nextSibling,
            se = E.nextSibling,
            M = se.nextSibling;
          M.nextSibling;
          var de = V.nextSibling,
            he = de.firstChild,
            G = he.nextSibling,
            oe = G.firstChild,
            ue = oe.firstChild,
            N = ue.firstChild,
            A = N.nextSibling,
            B = A.nextSibling,
            R = B.nextSibling,
            X = R.nextSibling,
            F = X.nextSibling,
            me = F.nextSibling;
          return (
            n(
              b,
              e(t, {
                get checked() {
                  return S();
                },
                onChange: i,
                get children() {
                  return ["Default (", te(() => (S() ? "checked" : "unchecked")), ")"];
                },
              }),
              null,
            ),
            n(b, e(t, { disabled: !0, children: "Disabled" }), null),
            n(b, e(t, { checked: !0, disabled: !0, children: "Checked Disabled" }), null),
            n(
              g,
              e(t, {
                get indeterminate() {
                  return k();
                },
                get checked() {
                  return k();
                },
                onChange: () => w(!k()),
                get children() {
                  return ["Indeterminate (", te(() => (k() ? "on" : "off")), ")"];
                },
              }),
            ),
            n(c, e(t, { checked: !0, theme: "primary", children: "Primary" }), null),
            n(c, e(t, { checked: !0, theme: "secondary", children: "Secondary" }), null),
            n(c, e(t, { checked: !0, theme: "success", children: "Success" }), null),
            n(c, e(t, { checked: !0, theme: "warning", children: "Warning" }), null),
            n(c, e(t, { checked: !0, theme: "danger", children: "Danger" }), null),
            n(c, e(t, { checked: !0, theme: "info", children: "Info" }), null),
            n(c, e(t, { checked: !0, theme: "gray", children: "Gray" }), null),
            n(c, e(t, { checked: !0, theme: "slate", children: "Slate" }), null),
            n(h, e(t, { checked: !0, size: "xs", children: "Extra Small" }), null),
            n(h, e(t, { checked: !0, size: "sm", children: "Small" }), null),
            n(h, e(t, { checked: !0, children: "Default" }), null),
            n(h, e(t, { checked: !0, size: "lg", children: "Large" }), null),
            n(h, e(t, { checked: !0, size: "xl", children: "Extra Large" }), null),
            n(x, e(t, { checked: !0, theme: "primary", size: "xs", children: "XS Primary" }), null),
            n(x, e(t, { checked: !0, theme: "success", size: "sm", children: "SM Success" }), null),
            n(x, e(t, { checked: !0, theme: "danger", children: "Default Danger" }), null),
            n(x, e(t, { checked: !0, theme: "info", size: "lg", children: "LG Info" }), null),
            n(x, e(t, { checked: !0, theme: "warning", size: "xl", children: "XL Warning" }), null),
            n(o, e(t, { checked: !0, theme: "primary", disabled: !0, children: "Primary" }), null),
            n(
              o,
              e(t, { checked: !0, theme: "secondary", disabled: !0, children: "Secondary" }),
              null,
            ),
            n(o, e(t, { checked: !0, theme: "success", disabled: !0, children: "Success" }), null),
            n(o, e(t, { checked: !0, theme: "warning", disabled: !0, children: "Warning" }), null),
            n(o, e(t, { checked: !0, theme: "danger", disabled: !0, children: "Danger" }), null),
            n(o, e(t, { checked: !0, theme: "info", disabled: !0, children: "Info" }), null),
            n(o, e(t, { checked: !0, theme: "gray", disabled: !0, children: "Gray" }), null),
            n(o, e(t, { checked: !0, theme: "slate", disabled: !0, children: "Slate" }), null),
            n(D, e(t, { inline: !0, checked: !0, children: "동의함" }), j),
            n(I, e(t, { inline: !0, children: "옵션A" }), E),
            n(I, e(t, { inline: !0, checked: !0, children: "옵션B" }), M),
            n(I, e(t, { inline: !0, children: "옵션C" }), null),
            r(G, We),
            n(N, e(t, { inset: !0, children: "Inset" })),
            n(B, e(t, { checked: !0, theme: "primary", inset: !0, children: "Primary Inset" })),
            n(X, e(t, { checked: !0, theme: "success", inset: !0, children: "Success Inset" })),
            n(me, e(t, { checked: !0, theme: "danger", inset: !0, children: "Danger Inset" })),
            y(
              (l) => {
                var q = s({ p: "xxl" }),
                  H = s({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" }),
                  J = s({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" }),
                  K = s({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" }),
                  O = s({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" }),
                  Q = s({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" }),
                  U = s({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" }),
                  Y = s({ p: "sm" }),
                  Z = s({ p: "sm" }),
                  ee = s({ p: "sm" });
                return (
                  q !== l.e && r(u, (l.e = q)),
                  H !== l.t && r(b, (l.t = H)),
                  J !== l.a && r(g, (l.a = J)),
                  K !== l.o && r(c, (l.o = K)),
                  O !== l.i && r(h, (l.i = O)),
                  Q !== l.n && r(x, (l.n = Q)),
                  U !== l.s && r(o, (l.s = U)),
                  Y !== l.h && r(A, (l.h = Y)),
                  Z !== l.r && r(R, (l.r = Z)),
                  ee !== l.d && r(F, (l.d = ee)),
                  l
                );
              },
              {
                e: void 0,
                t: void 0,
                a: void 0,
                o: void 0,
                i: void 0,
                n: void 0,
                s: void 0,
                h: void 0,
                r: void 0,
                d: void 0,
              },
            ),
            u
          );
        })(),
      ];
    },
  });
}
export { Ae as default };
