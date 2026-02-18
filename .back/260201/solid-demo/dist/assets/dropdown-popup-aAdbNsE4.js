import {
  q as _,
  r as ge,
  f as z,
  v as me,
  g as S,
  w as X,
  x as Y,
  y as N,
  c as E,
  h as Z,
  j as G,
  m as J,
  n as Q,
  i as O,
  t as L,
  e as ee,
  P as we,
  k as $,
  b as R,
} from "./index-DaQvuWeP.js";
import { M as U } from "./constants-Bbx-VEQM.js";
import { b as ye } from "./atoms.css-WCFmS3R-.js";
var Se = [
    "input:not([inert]):not([inert] *)",
    "select:not([inert]):not([inert] *)",
    "textarea:not([inert]):not([inert] *)",
    "a[href]:not([inert]):not([inert] *)",
    "button:not([inert]):not([inert] *)",
    "[tabindex]:not(slot):not([inert]):not([inert] *)",
    "audio[controls]:not([inert]):not([inert] *)",
    "video[controls]:not([inert]):not([inert] *)",
    '[contenteditable]:not([contenteditable="false"]):not([inert]):not([inert] *)',
    "details>summary:first-of-type:not([inert]):not([inert] *)",
    "details:not([inert]):not([inert] *)",
  ],
  F = Se.join(","),
  te = typeof Element > "u",
  I = te
    ? function () {}
    : Element.prototype.matches ||
      Element.prototype.msMatchesSelector ||
      Element.prototype.webkitMatchesSelector,
  x =
    !te && Element.prototype.getRootNode
      ? function (i) {
          var e;
          return i == null || (e = i.getRootNode) === null || e === void 0 ? void 0 : e.call(i);
        }
      : function (i) {
          return i?.ownerDocument;
        },
  T = function (e, r) {
    var t;
    r === void 0 && (r = !0);
    var n =
        e == null || (t = e.getAttribute) === null || t === void 0 ? void 0 : t.call(e, "inert"),
      l = n === "" || n === "true",
      s =
        l || (r && e && (typeof e.closest == "function" ? e.closest("[inert]") : T(e.parentNode)));
    return s;
  },
  Ee = function (e) {
    var r,
      t =
        e == null || (r = e.getAttribute) === null || r === void 0
          ? void 0
          : r.call(e, "contenteditable");
    return t === "" || t === "true";
  },
  Ce = function (e, r, t) {
    if (T(e)) return [];
    var n = Array.prototype.slice.apply(e.querySelectorAll(F));
    return (r && I.call(e, F) && n.unshift(e), (n = n.filter(t)), n);
  },
  M = function (e, r, t) {
    for (var n = [], l = Array.from(e); l.length; ) {
      var s = l.shift();
      if (!T(s, !1))
        if (s.tagName === "SLOT") {
          var o = s.assignedElements(),
            p = o.length ? o : s.children,
            u = M(p, !0, t);
          t.flatten ? n.push.apply(n, u) : n.push({ scopeParent: s, candidates: u });
        } else {
          var d = I.call(s, F);
          d && t.filter(s) && (r || !e.includes(s)) && n.push(s);
          var v = s.shadowRoot || (typeof t.getShadowRoot == "function" && t.getShadowRoot(s)),
            k = !T(v, !1) && (!t.shadowRootFilter || t.shadowRootFilter(s));
          if (v && k) {
            var w = M(v === !0 ? s.children : v.children, !0, t);
            t.flatten ? n.push.apply(n, w) : n.push({ scopeParent: s, candidates: w });
          } else l.unshift.apply(l, s.children);
        }
    }
    return n;
  },
  re = function (e) {
    return !isNaN(parseInt(e.getAttribute("tabindex"), 10));
  },
  ne = function (e) {
    if (!e) throw new Error("No node provided");
    return e.tabIndex < 0 && (/^(AUDIO|VIDEO|DETAILS)$/.test(e.tagName) || Ee(e)) && !re(e)
      ? 0
      : e.tabIndex;
  },
  Ie = function (e, r) {
    var t = ne(e);
    return t < 0 && r && !re(e) ? 0 : t;
  },
  Pe = function (e, r) {
    return e.tabIndex === r.tabIndex ? e.documentOrder - r.documentOrder : e.tabIndex - r.tabIndex;
  },
  ae = function (e) {
    return e.tagName === "INPUT";
  },
  xe = function (e) {
    return ae(e) && e.type === "hidden";
  },
  Te = function (e) {
    var r =
      e.tagName === "DETAILS" &&
      Array.prototype.slice.apply(e.children).some(function (t) {
        return t.tagName === "SUMMARY";
      });
    return r;
  },
  ke = function (e, r) {
    for (var t = 0; t < e.length; t++) if (e[t].checked && e[t].form === r) return e[t];
  },
  Ae = function (e) {
    if (!e.name) return !0;
    var r = e.form || x(e),
      t = function (o) {
        return r.querySelectorAll('input[type="radio"][name="' + o + '"]');
      },
      n;
    if (typeof window < "u" && typeof window.CSS < "u" && typeof window.CSS.escape == "function")
      n = t(window.CSS.escape(e.name));
    else
      try {
        n = t(e.name);
      } catch (s) {
        return (
          console.error(
            "Looks like you have a radio button with a name attribute containing invalid CSS selector characters and need the CSS.escape polyfill: %s",
            s.message,
          ),
          !1
        );
      }
    var l = ke(n, e.form);
    return !l || l === e;
  },
  De = function (e) {
    return ae(e) && e.type === "radio";
  },
  $e = function (e) {
    return De(e) && !Ae(e);
  },
  Re = function (e) {
    var r,
      t = e && x(e),
      n = (r = t) === null || r === void 0 ? void 0 : r.host,
      l = !1;
    if (t && t !== e) {
      var s, o, p;
      for (
        l = !!(
          ((s = n) !== null &&
            s !== void 0 &&
            (o = s.ownerDocument) !== null &&
            o !== void 0 &&
            o.contains(n)) ||
          (e != null && (p = e.ownerDocument) !== null && p !== void 0 && p.contains(e))
        );
        !l && n;
      ) {
        var u, d, v;
        ((t = x(n)),
          (n = (u = t) === null || u === void 0 ? void 0 : u.host),
          (l = !!(
            (d = n) !== null &&
            d !== void 0 &&
            (v = d.ownerDocument) !== null &&
            v !== void 0 &&
            v.contains(n)
          )));
      }
    }
    return l;
  },
  W = function (e) {
    var r = e.getBoundingClientRect(),
      t = r.width,
      n = r.height;
    return t === 0 && n === 0;
  },
  Ne = function (e, r) {
    var t = r.displayCheck,
      n = r.getShadowRoot;
    if (t === "full-native" && "checkVisibility" in e) {
      var l = e.checkVisibility({
        checkOpacity: !1,
        opacityProperty: !1,
        contentVisibilityAuto: !0,
        visibilityProperty: !0,
        checkVisibilityCSS: !0,
      });
      return !l;
    }
    if (getComputedStyle(e).visibility === "hidden") return !0;
    var s = I.call(e, "details>summary:first-of-type"),
      o = s ? e.parentElement : e;
    if (I.call(o, "details:not([open]) *")) return !0;
    if (!t || t === "full" || t === "full-native" || t === "legacy-full") {
      if (typeof n == "function") {
        for (var p = e; e; ) {
          var u = e.parentElement,
            d = x(e);
          if (u && !u.shadowRoot && n(u) === !0) return W(e);
          e.assignedSlot
            ? (e = e.assignedSlot)
            : !u && d !== e.ownerDocument
              ? (e = d.host)
              : (e = u);
        }
        e = p;
      }
      if (Re(e)) return !e.getClientRects().length;
      if (t !== "legacy-full") return !0;
    } else if (t === "non-zero-area") return W(e);
    return !1;
  },
  Oe = function (e) {
    if (/^(INPUT|BUTTON|SELECT|TEXTAREA)$/.test(e.tagName))
      for (var r = e.parentElement; r; ) {
        if (r.tagName === "FIELDSET" && r.disabled) {
          for (var t = 0; t < r.children.length; t++) {
            var n = r.children.item(t);
            if (n.tagName === "LEGEND")
              return I.call(r, "fieldset[disabled] *") ? !0 : !n.contains(e);
          }
          return !0;
        }
        r = r.parentElement;
      }
    return !1;
  },
  Fe = function (e, r) {
    return !(r.disabled || xe(r) || Ne(r, e) || Te(r) || Oe(r));
  },
  j = function (e, r) {
    return !($e(r) || ne(r) < 0 || !Fe(e, r));
  },
  Me = function (e) {
    var r = parseInt(e.getAttribute("tabindex"), 10);
    return !!(isNaN(r) || r >= 0);
  },
  ie = function (e) {
    var r = [],
      t = [];
    return (
      e.forEach(function (n, l) {
        var s = !!n.scopeParent,
          o = s ? n.scopeParent : n,
          p = Ie(o, s),
          u = s ? ie(n.candidates) : o;
        p === 0
          ? s
            ? r.push.apply(r, u)
            : r.push(o)
          : t.push({ documentOrder: l, tabIndex: p, item: n, isScope: s, content: u });
      }),
      t
        .sort(Pe)
        .reduce(function (n, l) {
          return (l.isScope ? n.push.apply(n, l.content) : n.push(l.content), n);
        }, [])
        .concat(r)
    );
  },
  C = function (e, r) {
    r = r || {};
    var t;
    return (
      r.getShadowRoot
        ? (t = M([e], r.includeContainer, {
            filter: j.bind(null, r),
            flatten: !1,
            getShadowRoot: r.getShadowRoot,
            shadowRootFilter: Me,
          }))
        : (t = Ce(e, r.includeContainer, j.bind(null, r))),
      ie(t)
    );
  };
const q = ge();
function Ze() {
  const i = _(q);
  if (i) return { id: i.id, parentId: i.parentId, open: i.open, close: i.close };
}
function oe() {
  return _(q);
}
var Le = "scid350",
  qe = L("<div role=button aria-haspopup=menu>");
const Be = (i) => {
    const e = [];
    let r = i.parentElement;
    for (; r; ) {
      const t = getComputedStyle(r),
        n = t.overflowY,
        l = t.overflowX;
      ((n === "auto" || n === "scroll" || l === "auto" || l === "scroll") && e.push(r),
        (r = r.parentElement));
    }
    return e;
  },
  Ge = (i) => {
    const [e, r] = z(i, ["open", "onOpenChange", "disabled", "children", "class"]),
      t = me(),
      n = oe(),
      [l, s] = S(new Set()),
      [o, p] = S(e.open ?? !1),
      u = () => e.onOpenChange !== void 0,
      d = X(() => (u() ? (e.open ?? !1) : o())),
      v = (a) => {
        e.disabled || (u() ? e.onOpenChange?.(a) : p(a));
      },
      k = () => v(!0),
      w = () => v(!1),
      B = () => v(!d()),
      [y, se] = S("bottom"),
      [le, ce] = S(!1),
      [ue, K] = S({});
    let g;
    const [de, pe] = S(!0),
      A = () => {
        const a = window.innerWidth <= U;
        if ((ce(a), !a)) {
          const f = g.getBoundingClientRect().top > window.innerHeight / 2;
          se(f ? "top" : "bottom");
        }
      },
      D = () => {
        if (window.innerWidth <= U) {
          K({});
          return;
        }
        const c = g.getBoundingClientRect(),
          f = window.innerHeight,
          h = window.innerWidth,
          b = c.left > h / 2,
          m = { "min-width": `${c.width}px` };
        (y() === "top" ? (m.bottom = `${f - c.top + 2}px`) : (m.top = `${c.bottom + 2}px`),
          b ? (m.right = `${h - c.right}px`) : (m.left = `${c.left}px`),
          K(m));
      };
    Y(() => {
      if (d()) {
        (n?.registerChild(t),
          A(),
          requestAnimationFrame(() => {
            D();
          }));
        const a = () => {
            (A(), D());
          },
          c = () => {
            (A(), D());
          },
          f = (b) => {
            const m = b.target;
            if (
              !(g.contains(m) || document.querySelector(`[data-dropdown-id="${t}"]`)?.contains(m))
            ) {
              for (const be of l())
                if (document.querySelector(`[data-dropdown-id="${be}"]`)?.contains(m)) return;
              w();
            }
          },
          h = Be(g);
        document.addEventListener("scroll", a, { capture: !0, passive: !0 });
        for (const b of h) b.addEventListener("scroll", a, { passive: !0 });
        (window.addEventListener("resize", c, { passive: !0 }),
          document.addEventListener("mousedown", f),
          N(() => {
            document.removeEventListener("scroll", a, { capture: !0 });
            for (const b of h) b.removeEventListener("scroll", a);
            (window.removeEventListener("resize", c),
              document.removeEventListener("mousedown", f),
              n?.unregisterChild(t));
          }));
      }
    });
    let P;
    const fe = (a) => {
        P = a.target;
      },
      V = (a) => {
        if (!d()) return;
        const c = a.relatedTarget;
        if (g.contains(c)) return;
        const f = document.querySelector(`[data-dropdown-id="${t}"]`);
        if (!f?.contains(c)) {
          for (const h of l())
            if (document.querySelector(`[data-dropdown-id="${h}"]`)?.contains(c)) return;
          if (c == null && P && (g.contains(P) || f?.contains(P))) {
            ((f ? C(f)[0] : void 0) ?? f)?.focus();
            return;
          }
          w();
        }
      },
      ve = (a) => {
        if (a.ctrlKey || a.altKey) return;
        const c =
            (a.key === "ArrowDown" && y() === "bottom") || (a.key === "ArrowUp" && y() === "top"),
          f = (a.key === "ArrowUp" && y() === "bottom") || (a.key === "ArrowDown" && y() === "top");
        if (c) {
          if ((a.preventDefault(), a.stopPropagation(), !d())) k();
          else {
            const h = document.querySelector(`[data-dropdown-id="${t}"]`),
              b = h ? C(h) : [];
            (y() === "top" ? b.at(-1) : b[0])?.focus();
          }
          return;
        }
        if (f && d()) {
          (a.preventDefault(), a.stopPropagation(), w());
          return;
        }
        switch (a.key) {
          case " ":
            (a.preventDefault(), a.stopPropagation(), B());
            break;
          case "Escape":
            d() && (a.preventDefault(), a.stopPropagation(), w(), g.focus());
            break;
        }
      },
      he = {
        id: t,
        parentId: n?.id,
        open: d,
        close: w,
        registerChild: (a) => {
          s((c) => new Set(c).add(a));
        },
        unregisterChild: (a) => {
          s((c) => {
            const f = new Set(c);
            return (f.delete(a), f);
          });
        },
        isDescendant: (a) => l().has(a),
        placement: y,
        isMobile: le,
        popupStyle: ue,
        focusTrigger: () => {
          const a = C(g)[0];
          a != null ? a.focus() : g.focus();
        },
      };
    return E(q.Provider, {
      value: he,
      get children() {
        var a = qe();
        return (
          (a.$$mouseover = fe),
          (a.$$keydown = ve),
          (a.$$click = (c) => {
            (c.stopPropagation(), B());
          }),
          Z((c) => {
            ((g = c),
              c.addEventListener("blur", V, !0),
              N(() => c.removeEventListener("blur", V, !0)),
              requestAnimationFrame(() => {
                pe(C(c).length > 0);
              }));
          }, a),
          G(
            a,
            J(
              {
                get "tabIndex"() {
                  return Q(() => !!e.disabled)() || de() ? -1 : 0;
                },
                get "aria-expanded"() {
                  return d();
                },
                get "aria-controls"() {
                  return d() ? `dropdown-popup-${t}` : void 0;
                },
                get "aria-disabled"() {
                  return e.disabled || void 0;
                },
                get "class"() {
                  return [Le, e.class].filterExists().join(" ");
                },
                get "data-disabled"() {
                  return e.disabled;
                },
              },
              r,
            ),
            !1,
            !0,
          ),
          O(a, () => e.children),
          a
        );
      },
    });
  };
ee(["click", "keydown", "mouseover"]);
var Ke = ye({
    defaultClassName: "bhfv9g3",
    variantClassNames: {
      placement: { bottom: "bhfv9g4", top: "bhfv9g5" },
      mobile: { true: "bhfv9g6" },
    },
    defaultVariants: {},
    compoundVariants: [],
  }),
  Ve = "bhfv9g7",
  Ue = "bhfv9g8",
  We = "bhfv9g9",
  H = L("<div>"),
  je = L("<div role=menu tabindex=-1><div>");
const Je = (i) => {
  const [e, r] = z(i, ["children", "class", "style", "showHandle"]),
    t = oe();
  if (!t)
    throw new Error(`[DropdownPopup] Dropdown 컴포넌트 내부에서 사용해야 합니다.
DropdownPopup은 반드시 <Dropdown> 컴포넌트의 자식으로 배치해야 합니다.`);
  const n = X(() => e.showHandle ?? !0);
  let l;
  Y(() => {
    if (t.open()) {
      const o = requestAnimationFrame(() => {
        const p = t.popupStyle();
        (Object.entries(p).forEach(([u, d]) => {
          d !== void 0 && l.style.setProperty(u, String(d));
        }),
          l.focus());
      });
      N(() => cancelAnimationFrame(o));
    }
  });
  const s = (o) => {
    if (o.key === "Escape") {
      (o.preventDefault(), o.stopPropagation(), t.close());
      return;
    }
    if (!o.ctrlKey && !o.altKey) {
      const p = C(l);
      ((t.placement() === "bottom" && o.key === "ArrowUp" && document.activeElement === p[0]) ||
        (t.placement() === "top" &&
          o.key === "ArrowDown" &&
          document.activeElement === p.at(-1))) &&
        (o.preventDefault(), o.stopPropagation(), t.focusTrigger());
    }
  };
  return E($, {
    get when() {
      return t.open();
    },
    get children() {
      return E(we, {
        get children() {
          return [
            E($, {
              get when() {
                return t.isMobile();
              },
              get children() {
                var o = H();
                return ((o.$$click = () => t.close()), R(o, Ue), o);
              },
            }),
            (() => {
              var o = je(),
                p = o.firstChild;
              o.$$keydown = s;
              var u = l;
              return (
                typeof u == "function" ? Z(u, o) : (l = o),
                G(
                  o,
                  J(
                    {
                      get "id"() {
                        return `dropdown-popup-${t.id}`;
                      },
                      get "data-dropdown-id"() {
                        return t.id;
                      },
                      get "class"() {
                        return [Ke({ placement: t.placement(), mobile: t.isMobile() }), e.class]
                          .filterExists()
                          .join(" ");
                      },
                      get "style"() {
                        return e.style;
                      },
                    },
                    r,
                  ),
                  !1,
                  !0,
                ),
                O(
                  o,
                  E($, {
                    get when() {
                      return Q(() => !!t.isMobile())() && n();
                    },
                    get children() {
                      var d = H();
                      return (R(d, We), d);
                    },
                  }),
                  p,
                ),
                R(p, Ve),
                O(p, () => e.children),
                o
              );
            })(),
          ];
        },
      });
    },
  });
};
ee(["click", "keydown"]);
export { Ge as D, Je as a, Ze as u };
