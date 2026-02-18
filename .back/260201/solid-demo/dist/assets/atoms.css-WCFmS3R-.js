import {
  y as q,
  x as V,
  a as F,
  C as G,
  D as M,
  c as K,
  i as H,
  E as W,
  j as X,
  f as Y,
  q as U,
  r as J,
} from "./index-DaQvuWeP.js";
function Q(e, t) {
  if (typeof e != "object" || !e) return e;
  var a = e[Symbol.toPrimitive];
  if (a !== void 0) {
    var s = a.call(e, t);
    if (typeof s != "object") return s;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (t === "string" ? String : Number)(e);
}
function Z(e) {
  var t = Q(e, "string");
  return typeof t == "symbol" ? t : String(t);
}
function I(e, t, a) {
  return (
    (t = Z(t)),
    t in e
      ? Object.defineProperty(e, t, { value: a, enumerable: !0, configurable: !0, writable: !0 })
      : (e[t] = a),
    e
  );
}
function k(e, t) {
  var a = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var s = Object.getOwnPropertySymbols(e);
    (t &&
      (s = s.filter(function (n) {
        return Object.getOwnPropertyDescriptor(e, n).enumerable;
      })),
      a.push.apply(a, s));
  }
  return a;
}
function A(e) {
  for (var t = 1; t < arguments.length; t++) {
    var a = arguments[t] != null ? arguments[t] : {};
    t % 2
      ? k(Object(a), !0).forEach(function (s) {
          I(e, s, a[s]);
        })
      : Object.getOwnPropertyDescriptors
        ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(a))
        : k(Object(a)).forEach(function (s) {
            Object.defineProperty(e, s, Object.getOwnPropertyDescriptor(a, s));
          });
  }
  return e;
}
function L(e, t) {
  var a = {};
  for (var s in e) a[s] = t(e[s], s);
  return a;
}
var ee = (e, t, a) => {
    for (var s of Object.keys(e)) {
      var n;
      if (e[s] !== ((n = t[s]) !== null && n !== void 0 ? n : a[s])) return !1;
    }
    return !0;
  },
  _e = (e) => {
    var t = (a) => {
      var s = e.defaultClassName,
        n = A(A({}, e.defaultVariants), a);
      for (var x in n) {
        var l,
          d = (l = n[x]) !== null && l !== void 0 ? l : e.defaultVariants[x];
        if (d != null) {
          var u = d;
          typeof u == "boolean" && (u = u === !0 ? "true" : "false");
          var h = e.variantClassNames[x][u];
          h && (s += " " + h);
        }
      }
      for (var [o, f] of e.compoundVariants) ee(o, n, e.defaultVariants) && (s += " " + f);
      return s;
    };
    return (
      (t.variants = () => Object.keys(e.variantClassNames)),
      (t.classNames = {
        get base() {
          return e.defaultClassName.split(" ")[0];
        },
        get variants() {
          return L(e.variantClassNames, (a) => L(a, (s) => s.split(" ")[0]));
        },
      }),
      t
    );
  };
const se = (e) => e != null,
  me = (e) => e.filter(se),
  D = (e) => (typeof e == "function" && !e.length ? e() : e),
  N = (e) => (Array.isArray(e) ? e : e ? [e] : []),
  ae = q;
function ge(e, t, a, s) {
  const n = e.length,
    x = t.length;
  let l = 0;
  if (!x) {
    for (; l < n; l++) a(e[l]);
    return;
  }
  if (!n) {
    for (; l < x; l++) s(t[l]);
    return;
  }
  for (; l < x && t[l] === e[l]; l++);
  let d, u;
  ((t = t.slice(l)), (e = e.slice(l)));
  for (d of t) e.includes(d) || s(d);
  for (u of e) t.includes(u) || a(u);
}
function te(e, t, a, s) {
  return (e.addEventListener(t, a, s), ae(e.removeEventListener.bind(e, t, a, s)));
}
function le(e, t, a, s) {
  const n = () => {
    N(D(e)).forEach((x) => {
      x && N(D(t)).forEach((l) => te(x, l, a, s));
    });
  };
  typeof e == "function" ? V(n) : F(n);
}
var z = "nkvqts2",
  R = "nkvqts3";
function oe(e) {
  return ["relative", "absolute", "fixed", "sticky"].includes(getComputedStyle(e).position);
}
const ve = (e, t) => {
  const a = new Set();
  (q(() => {
    for (const s of a) s.abort();
    (a.clear(), e.querySelectorAll(`.${z}`).forEach((s) => s.remove()));
  }),
    le(e, "pointerdown", (s) => {
      const n = t?.(),
        x = n === void 0 || n === !0 || (typeof n == "object" && n.enabled !== !1),
        l = typeof n == "object" && n.stopPropagation === !0;
      if (!x) return;
      (l && s.stopPropagation(),
        oe(e) || (e.style.position = "relative"),
        (e.style.overflow = "hidden"));
      const d = e.getBoundingClientRect(),
        u = s.clientX - d.left,
        h = s.clientY - d.top,
        o = Math.max(
          Math.hypot(u, h),
          Math.hypot(d.width - u, h),
          Math.hypot(u, d.height - h),
          Math.hypot(d.width - u, d.height - h),
        ),
        f = o * 2,
        r = document.createElement("span");
      (r.classList.add(z),
        (r.style.width = r.style.height = `${f}px`),
        (r.style.left = `${u - o}px`),
        (r.style.top = `${h - o}px`),
        e.appendChild(r));
      let i = !1,
        p = !1;
      const c = () => {
          i && p && r.classList.add(R);
        },
        w = new AbortController();
      a.add(w);
      const C = () => {
          (w.abort(), a.delete(w), r.remove());
        },
        { signal: m } = w;
      r.addEventListener(
        "animationend",
        () => {
          r.classList.contains(R) ? C() : ((i = !0), c());
        },
        { signal: m },
      );
      const g = () => {
        ((p = !0), c());
      };
      (document.addEventListener("pointerup", g, { signal: m }),
        document.addEventListener("pointercancel", g, { signal: m }));
    }));
};
function be(e, t) {
  return ne(e, t);
}
function ne(e, t) {
  const a = {};
  for (const s of t) a[s] = e[s];
  return a;
}
const re = {
    outline: {
      "xmlns": "http://www.w3.org/2000/svg",
      "width": 24,
      "height": 24,
      "viewBox": "0 0 24 24",
      "fill": "none",
      "stroke": "currentColor",
      "stroke-width": 2,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    },
    filled: {
      xmlns: "http://www.w3.org/2000/svg",
      width: 24,
      height: 24,
      viewBox: "0 0 24 24",
      fill: "currentColor",
      stroke: "none",
    },
  },
  y = Symbol("hyper-element");
function ue(e) {
  function t() {
    let a = [].slice.call(arguments),
      s,
      n = [],
      x = !1;
    for (; Array.isArray(a[0]); ) a = a[0];
    (a[0][y] && a.unshift(t.Fragment), typeof a[0] == "string" && h(a));
    const l = () => {
      for (; a.length; ) d(a.shift());
      return (s instanceof Element && n.length && s.classList.add(...n), s);
    };
    return ((l[y] = !0), l);
    function d(o) {
      const f = typeof o;
      if (o != null) {
        if (f === "string") s ? s.appendChild(document.createTextNode(o)) : u(o);
        else if (
          f === "number" ||
          f === "boolean" ||
          f === "bigint" ||
          f === "symbol" ||
          o instanceof Date ||
          o instanceof RegExp
        )
          s.appendChild(document.createTextNode(o.toString()));
        else if (Array.isArray(o)) for (let r = 0; r < o.length; r++) d(o[r]);
        else if (o instanceof Element) e.insert(s, o, x ? null : void 0);
        else if (f === "object") {
          let r = !1;
          const i = Object.getOwnPropertyDescriptors(o);
          for (const p in i) {
            if (p === "class" && n.length !== 0) {
              const c = n.join(" "),
                w =
                  typeof i.class.value == "function"
                    ? () => c + " " + i.class.value()
                    : c + " " + o.class;
              (Object.defineProperty(o, "class", { ...i[p], value: w }), (n = []));
            }
            p !== "ref" && p.slice(0, 2) !== "on" && typeof i[p].value == "function"
              ? (e.dynamicProperty(o, p), (r = !0))
              : i[p].get && (r = !0);
          }
          r
            ? e.spread(s, o, s instanceof SVGElement, !!a.length)
            : e.assign(s, o, s instanceof SVGElement, !!a.length);
        } else if (f === "function")
          if (s) {
            for (; o[y]; ) o = o();
            e.insert(s, o, x ? null : void 0);
          } else {
            let r,
              i = a[0];
            ((i == null ||
              (typeof i == "object" && !Array.isArray(i) && !(i instanceof Element))) &&
              (r = a.shift()),
              r || (r = {}),
              a.length && (r.children = a.length > 1 ? a : a[0]));
            const p = Object.getOwnPropertyDescriptors(r);
            for (const c in p)
              if (Array.isArray(p[c].value)) {
                const w = p[c].value;
                ((r[c] = () => {
                  for (let C = 0; C < w.length; C++) for (; w[C][y]; ) w[C] = w[C]();
                  return w;
                }),
                  e.dynamicProperty(r, c));
              } else
                typeof p[c].value == "function" && !p[c].value.length && e.dynamicProperty(r, c);
            ((s = e.createComponent(o, r)), (a = []));
          }
      }
    }
    function u(o) {
      const f = o.split(/([\.#]?[^\s#.]+)/);
      /^\.|#/.test(f[1]) && (s = document.createElement("div"));
      for (let r = 0; r < f.length; r++) {
        const i = f[r],
          p = i.substring(1, i.length);
        i &&
          (s
            ? i[0] === "."
              ? n.push(p)
              : i[0] === "#" && s.setAttribute("id", p)
            : (s = e.SVGElements.has(i)
                ? document.createElementNS("http://www.w3.org/2000/svg", i)
                : document.createElement(i)));
      }
    }
    function h(o) {
      for (let f = 1; f < o.length; f++)
        if (typeof o[f] == "function") {
          x = !0;
          return;
        } else Array.isArray(o[f]) && h(o[f]);
    }
  }
  return ((t.Fragment = (a) => a.children), t);
}
const O = ue({
  spread: X,
  assign: W,
  insert: H,
  createComponent: K,
  dynamicProperty: M,
  SVGElements: G,
});
const ye = (e, t, a, s) => {
    const n = (x) => {
      const [l, d] = Y(x, ["color", "size", "stroke", "title", "children", "class"]),
        u = re[e],
        h = {
          ...u,
          width: () => (l.size != null ? l.size : u.width),
          height: () => (l.size != null ? l.size : u.height),
          title: () => (l.title != null ? l.title : void 0),
          ...(e === "filled"
            ? { fill: () => (l.color != null ? l.color : "currentColor") }
            : {
                "stroke": () => (l.color != null ? l.color : "currentColor"),
                "stroke-width": () => (l.stroke != null ? l.stroke : u["stroke-width"]),
              }),
          class: () => `tabler-icon tabler-icon-${t} ${l.class != null ? l.class : ""}`,
        };
      return O(
        "svg",
        [h, d],
        [l.title && O("title", {}, l.title), ...s.map(([o, f]) => O(o, f)), l.children],
      );
    };
    return ((n.displayName = `${a}`), n);
  },
  fe = J();
function Oe() {
  const e = U(fe);
  if (!e)
    throw new Error(`[useSidebar] SidebarContainer 내부에서 사용해야 합니다.
Sidebar, SidebarMenu, SidebarUser 등의 컴포넌트는 반드시 SidebarContainer로 감싸야 합니다.`);
  return e;
}
function ie(e, t) {
  if (typeof e != "object" || !e) return e;
  var a = e[Symbol.toPrimitive];
  if (a !== void 0) {
    var s = a.call(e, t);
    if (typeof s != "object") return s;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (t === "string" ? String : Number)(e);
}
function pe(e) {
  var t = ie(e, "string");
  return typeof t == "symbol" ? t : String(t);
}
function xe(e, t, a) {
  return (
    (t = pe(t)),
    t in e
      ? Object.defineProperty(e, t, { value: a, enumerable: !0, configurable: !0, writable: !0 })
      : (e[t] = a),
    e
  );
}
function T(e, t) {
  var a = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var s = Object.getOwnPropertySymbols(e);
    (t &&
      (s = s.filter(function (n) {
        return Object.getOwnPropertyDescriptor(e, n).enumerable;
      })),
      a.push.apply(a, s));
  }
  return a;
}
function j(e) {
  for (var t = 1; t < arguments.length; t++) {
    var a = arguments[t] != null ? arguments[t] : {};
    t % 2
      ? T(Object(a), !0).forEach(function (s) {
          xe(e, s, a[s]);
        })
      : Object.getOwnPropertyDescriptors
        ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(a))
        : T(Object(a)).forEach(function (s) {
            Object.defineProperty(e, s, Object.getOwnPropertyDescriptor(a, s));
          });
  }
  return e;
}
var de = (e) =>
    function () {
      for (var t = arguments.length, a = new Array(t), s = 0; s < t; s++) a[s] = arguments[s];
      var n = Object.assign({}, ...a.map((u) => u.styles)),
        x = Object.keys(n),
        l = x.filter((u) => "mappings" in n[u]),
        d = (u) => {
          var h = [],
            o = {},
            f = j({}, u),
            r = !1;
          for (var i of l) {
            var p = u[i];
            if (p != null) {
              var c = n[i];
              r = !0;
              for (var w of c.mappings) ((o[w] = p), f[w] == null && delete f[w]);
            }
          }
          var C = r ? j(j({}, o), f) : u,
            m = function () {
              var _ = C[g],
                v = n[g];
              try {
                if (v.mappings) return 1;
                if (typeof _ == "string" || typeof _ == "number") h.push(v.values[_].defaultClass);
                else if (Array.isArray(_))
                  for (var b = 0; b < _.length; b++) {
                    var P = _[b];
                    if (P != null) {
                      var $ = v.responsiveArray[b];
                      h.push(v.values[P].conditions[$]);
                    }
                  }
                else
                  for (var S in _) {
                    var E = _[S];
                    E != null && h.push(v.values[E].conditions[S]);
                  }
              } catch (B) {
                throw B;
              }
            };
          for (var g in C) m();
          return e(h.join(" "));
        };
      return Object.assign(d, { properties: new Set(x) });
    },
  he = (e) => e,
  we = function () {
    return de(he)(...arguments);
  },
  je = we({
    conditions: void 0,
    styles: {
      p: { mappings: ["padding"] },
      pt: { mappings: ["paddingTop"] },
      pr: { mappings: ["paddingRight"] },
      pb: { mappings: ["paddingBottom"] },
      pl: { mappings: ["paddingLeft"] },
      px: { mappings: ["paddingLeft", "paddingRight"] },
      py: { mappings: ["paddingTop", "paddingBottom"] },
      m: { mappings: ["margin"] },
      mt: { mappings: ["marginTop"] },
      mr: { mappings: ["marginRight"] },
      mb: { mappings: ["marginBottom"] },
      ml: { mappings: ["marginLeft"] },
      mx: { mappings: ["marginLeft", "marginRight"] },
      my: { mappings: ["marginTop", "marginBottom"] },
      display: {
        values: {
          "none": { defaultClass: "_1p6wxoh0" },
          "block": { defaultClass: "_1p6wxoh1" },
          "inline": { defaultClass: "_1p6wxoh2" },
          "flex": { defaultClass: "_1p6wxoh3" },
          "inline-flex": { defaultClass: "_1p6wxoh4" },
          "grid": { defaultClass: "_1p6wxoh5" },
        },
      },
      flexDirection: {
        values: {
          "row": { defaultClass: "_1p6wxoh6" },
          "column": { defaultClass: "_1p6wxoh7" },
          "row-reverse": { defaultClass: "_1p6wxoh8" },
          "column-reverse": { defaultClass: "_1p6wxoh9" },
        },
      },
      flexWrap: {
        values: {
          "nowrap": { defaultClass: "_1p6wxoha" },
          "wrap": { defaultClass: "_1p6wxohb" },
          "wrap-reverse": { defaultClass: "_1p6wxohc" },
        },
      },
      alignItems: {
        values: {
          "stretch": { defaultClass: "_1p6wxohd" },
          "flex-start": { defaultClass: "_1p6wxohe" },
          "center": { defaultClass: "_1p6wxohf" },
          "flex-end": { defaultClass: "_1p6wxohg" },
          "baseline": { defaultClass: "_1p6wxohh" },
        },
      },
      justifyContent: {
        values: {
          "flex-start": { defaultClass: "_1p6wxohi" },
          "center": { defaultClass: "_1p6wxohj" },
          "flex-end": { defaultClass: "_1p6wxohk" },
          "space-between": { defaultClass: "_1p6wxohl" },
          "space-around": { defaultClass: "_1p6wxohm" },
          "space-evenly": { defaultClass: "_1p6wxohn" },
        },
      },
      gap: {
        values: {
          auto: { defaultClass: "_1p6wxoho" },
          none: { defaultClass: "_1p6wxohp" },
          xxs: { defaultClass: "_1p6wxohq" },
          xs: { defaultClass: "_1p6wxohr" },
          sm: { defaultClass: "_1p6wxohs" },
          base: { defaultClass: "_1p6wxoht" },
          lg: { defaultClass: "_1p6wxohu" },
          xl: { defaultClass: "_1p6wxohv" },
          xxl: { defaultClass: "_1p6wxohw" },
          xxxl: { defaultClass: "_1p6wxohx" },
          xxxxl: { defaultClass: "_1p6wxohy" },
        },
      },
      rowGap: {
        values: {
          auto: { defaultClass: "_1p6wxohz" },
          none: { defaultClass: "_1p6wxoh10" },
          xxs: { defaultClass: "_1p6wxoh11" },
          xs: { defaultClass: "_1p6wxoh12" },
          sm: { defaultClass: "_1p6wxoh13" },
          base: { defaultClass: "_1p6wxoh14" },
          lg: { defaultClass: "_1p6wxoh15" },
          xl: { defaultClass: "_1p6wxoh16" },
          xxl: { defaultClass: "_1p6wxoh17" },
          xxxl: { defaultClass: "_1p6wxoh18" },
          xxxxl: { defaultClass: "_1p6wxoh19" },
        },
      },
      columnGap: {
        values: {
          auto: { defaultClass: "_1p6wxoh1a" },
          none: { defaultClass: "_1p6wxoh1b" },
          xxs: { defaultClass: "_1p6wxoh1c" },
          xs: { defaultClass: "_1p6wxoh1d" },
          sm: { defaultClass: "_1p6wxoh1e" },
          base: { defaultClass: "_1p6wxoh1f" },
          lg: { defaultClass: "_1p6wxoh1g" },
          xl: { defaultClass: "_1p6wxoh1h" },
          xxl: { defaultClass: "_1p6wxoh1i" },
          xxxl: { defaultClass: "_1p6wxoh1j" },
          xxxxl: { defaultClass: "_1p6wxoh1k" },
        },
      },
      padding: {
        values: {
          auto: { defaultClass: "_1p6wxoh1l" },
          none: { defaultClass: "_1p6wxoh1m" },
          xxs: { defaultClass: "_1p6wxoh1n" },
          xs: { defaultClass: "_1p6wxoh1o" },
          sm: { defaultClass: "_1p6wxoh1p" },
          base: { defaultClass: "_1p6wxoh1q" },
          lg: { defaultClass: "_1p6wxoh1r" },
          xl: { defaultClass: "_1p6wxoh1s" },
          xxl: { defaultClass: "_1p6wxoh1t" },
          xxxl: { defaultClass: "_1p6wxoh1u" },
          xxxxl: { defaultClass: "_1p6wxoh1v" },
        },
      },
      paddingTop: {
        values: {
          auto: { defaultClass: "_1p6wxoh1w" },
          none: { defaultClass: "_1p6wxoh1x" },
          xxs: { defaultClass: "_1p6wxoh1y" },
          xs: { defaultClass: "_1p6wxoh1z" },
          sm: { defaultClass: "_1p6wxoh20" },
          base: { defaultClass: "_1p6wxoh21" },
          lg: { defaultClass: "_1p6wxoh22" },
          xl: { defaultClass: "_1p6wxoh23" },
          xxl: { defaultClass: "_1p6wxoh24" },
          xxxl: { defaultClass: "_1p6wxoh25" },
          xxxxl: { defaultClass: "_1p6wxoh26" },
        },
      },
      paddingRight: {
        values: {
          auto: { defaultClass: "_1p6wxoh27" },
          none: { defaultClass: "_1p6wxoh28" },
          xxs: { defaultClass: "_1p6wxoh29" },
          xs: { defaultClass: "_1p6wxoh2a" },
          sm: { defaultClass: "_1p6wxoh2b" },
          base: { defaultClass: "_1p6wxoh2c" },
          lg: { defaultClass: "_1p6wxoh2d" },
          xl: { defaultClass: "_1p6wxoh2e" },
          xxl: { defaultClass: "_1p6wxoh2f" },
          xxxl: { defaultClass: "_1p6wxoh2g" },
          xxxxl: { defaultClass: "_1p6wxoh2h" },
        },
      },
      paddingBottom: {
        values: {
          auto: { defaultClass: "_1p6wxoh2i" },
          none: { defaultClass: "_1p6wxoh2j" },
          xxs: { defaultClass: "_1p6wxoh2k" },
          xs: { defaultClass: "_1p6wxoh2l" },
          sm: { defaultClass: "_1p6wxoh2m" },
          base: { defaultClass: "_1p6wxoh2n" },
          lg: { defaultClass: "_1p6wxoh2o" },
          xl: { defaultClass: "_1p6wxoh2p" },
          xxl: { defaultClass: "_1p6wxoh2q" },
          xxxl: { defaultClass: "_1p6wxoh2r" },
          xxxxl: { defaultClass: "_1p6wxoh2s" },
        },
      },
      paddingLeft: {
        values: {
          auto: { defaultClass: "_1p6wxoh2t" },
          none: { defaultClass: "_1p6wxoh2u" },
          xxs: { defaultClass: "_1p6wxoh2v" },
          xs: { defaultClass: "_1p6wxoh2w" },
          sm: { defaultClass: "_1p6wxoh2x" },
          base: { defaultClass: "_1p6wxoh2y" },
          lg: { defaultClass: "_1p6wxoh2z" },
          xl: { defaultClass: "_1p6wxoh30" },
          xxl: { defaultClass: "_1p6wxoh31" },
          xxxl: { defaultClass: "_1p6wxoh32" },
          xxxxl: { defaultClass: "_1p6wxoh33" },
        },
      },
      margin: {
        values: {
          auto: { defaultClass: "_1p6wxoh34" },
          none: { defaultClass: "_1p6wxoh35" },
          xxs: { defaultClass: "_1p6wxoh36" },
          xs: { defaultClass: "_1p6wxoh37" },
          sm: { defaultClass: "_1p6wxoh38" },
          base: { defaultClass: "_1p6wxoh39" },
          lg: { defaultClass: "_1p6wxoh3a" },
          xl: { defaultClass: "_1p6wxoh3b" },
          xxl: { defaultClass: "_1p6wxoh3c" },
          xxxl: { defaultClass: "_1p6wxoh3d" },
          xxxxl: { defaultClass: "_1p6wxoh3e" },
        },
      },
      marginTop: {
        values: {
          auto: { defaultClass: "_1p6wxoh3f" },
          none: { defaultClass: "_1p6wxoh3g" },
          xxs: { defaultClass: "_1p6wxoh3h" },
          xs: { defaultClass: "_1p6wxoh3i" },
          sm: { defaultClass: "_1p6wxoh3j" },
          base: { defaultClass: "_1p6wxoh3k" },
          lg: { defaultClass: "_1p6wxoh3l" },
          xl: { defaultClass: "_1p6wxoh3m" },
          xxl: { defaultClass: "_1p6wxoh3n" },
          xxxl: { defaultClass: "_1p6wxoh3o" },
          xxxxl: { defaultClass: "_1p6wxoh3p" },
        },
      },
      marginRight: {
        values: {
          auto: { defaultClass: "_1p6wxoh3q" },
          none: { defaultClass: "_1p6wxoh3r" },
          xxs: { defaultClass: "_1p6wxoh3s" },
          xs: { defaultClass: "_1p6wxoh3t" },
          sm: { defaultClass: "_1p6wxoh3u" },
          base: { defaultClass: "_1p6wxoh3v" },
          lg: { defaultClass: "_1p6wxoh3w" },
          xl: { defaultClass: "_1p6wxoh3x" },
          xxl: { defaultClass: "_1p6wxoh3y" },
          xxxl: { defaultClass: "_1p6wxoh3z" },
          xxxxl: { defaultClass: "_1p6wxoh40" },
        },
      },
      marginBottom: {
        values: {
          auto: { defaultClass: "_1p6wxoh41" },
          none: { defaultClass: "_1p6wxoh42" },
          xxs: { defaultClass: "_1p6wxoh43" },
          xs: { defaultClass: "_1p6wxoh44" },
          sm: { defaultClass: "_1p6wxoh45" },
          base: { defaultClass: "_1p6wxoh46" },
          lg: { defaultClass: "_1p6wxoh47" },
          xl: { defaultClass: "_1p6wxoh48" },
          xxl: { defaultClass: "_1p6wxoh49" },
          xxxl: { defaultClass: "_1p6wxoh4a" },
          xxxxl: { defaultClass: "_1p6wxoh4b" },
        },
      },
      marginLeft: {
        values: {
          auto: { defaultClass: "_1p6wxoh4c" },
          none: { defaultClass: "_1p6wxoh4d" },
          xxs: { defaultClass: "_1p6wxoh4e" },
          xs: { defaultClass: "_1p6wxoh4f" },
          sm: { defaultClass: "_1p6wxoh4g" },
          base: { defaultClass: "_1p6wxoh4h" },
          lg: { defaultClass: "_1p6wxoh4i" },
          xl: { defaultClass: "_1p6wxoh4j" },
          xxl: { defaultClass: "_1p6wxoh4k" },
          xxxl: { defaultClass: "_1p6wxoh4l" },
          xxxxl: { defaultClass: "_1p6wxoh4m" },
        },
      },
      fontSize: {
        values: {
          sm: { defaultClass: "_1p6wxoh4n" },
          base: { defaultClass: "_1p6wxoh4o" },
          lg: { defaultClass: "_1p6wxoh4p" },
          h6: { defaultClass: "_1p6wxoh4q" },
          h5: { defaultClass: "_1p6wxoh4r" },
          h4: { defaultClass: "_1p6wxoh4s" },
          h3: { defaultClass: "_1p6wxoh4t" },
          h2: { defaultClass: "_1p6wxoh4u" },
          h1: { defaultClass: "_1p6wxoh4v" },
        },
      },
      lineHeight: {
        values: {
          tight: { defaultClass: "_1p6wxoh4w" },
          normal: { defaultClass: "_1p6wxoh4x" },
          relaxed: { defaultClass: "_1p6wxoh4y" },
        },
      },
      borderRadius: {
        values: {
          none: { defaultClass: "_1p6wxoh4z" },
          xs: { defaultClass: "_1p6wxoh50" },
          sm: { defaultClass: "_1p6wxoh51" },
          base: { defaultClass: "_1p6wxoh52" },
          lg: { defaultClass: "_1p6wxoh53" },
          xl: { defaultClass: "_1p6wxoh54" },
          xxl: { defaultClass: "_1p6wxoh55" },
          full: { defaultClass: "_1p6wxoh56" },
        },
      },
      boxShadow: {
        values: {
          sm: { defaultClass: "_1p6wxoh57" },
          base: { defaultClass: "_1p6wxoh58" },
          lg: { defaultClass: "_1p6wxoh59" },
          xl: { defaultClass: "_1p6wxoh5a" },
        },
      },
      opacity: {
        values: {
          muted: { defaultClass: "_1p6wxoh5b" },
          base: { defaultClass: "_1p6wxoh5c" },
          light: { defaultClass: "_1p6wxoh5d" },
        },
      },
      width: {
        values: { auto: { defaultClass: "_1p6wxoh5e" }, full: { defaultClass: "_1p6wxoh5f" } },
      },
      height: {
        values: { auto: { defaultClass: "_1p6wxoh5g" }, full: { defaultClass: "_1p6wxoh5h" } },
      },
      position: {
        values: {
          static: { defaultClass: "_1p6wxoh5i" },
          relative: { defaultClass: "_1p6wxoh5j" },
          absolute: { defaultClass: "_1p6wxoh5k" },
          fixed: { defaultClass: "_1p6wxoh5l" },
        },
      },
      fontWeight: {
        values: { normal: { defaultClass: "_1p6wxoh5m" }, bold: { defaultClass: "_1p6wxoh5n" } },
      },
      color: {
        values: {
          base: { defaultClass: "_1p6wxoh5o" },
          muted: { defaultClass: "_1p6wxoh5p" },
          inverted: { defaultClass: "_1p6wxoh5q" },
          primary: { defaultClass: "_1p6wxoh5r" },
          secondary: { defaultClass: "_1p6wxoh5s" },
          success: { defaultClass: "_1p6wxoh5t" },
          warning: { defaultClass: "_1p6wxoh5u" },
          danger: { defaultClass: "_1p6wxoh5v" },
          info: { defaultClass: "_1p6wxoh5w" },
          gray: { defaultClass: "_1p6wxoh5x" },
          slate: { defaultClass: "_1p6wxoh5y" },
        },
      },
    },
  });
export {
  fe as S,
  je as a,
  _e as b,
  ye as c,
  N as d,
  D as e,
  me as f,
  ge as h,
  be as o,
  ve as r,
  Oe as u,
};
