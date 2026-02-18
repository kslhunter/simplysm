import {
  g as P,
  c as e,
  a as V,
  b as u,
  i as n,
  F as W,
  s as o,
  d as S,
  t as a,
} from "./index-DaQvuWeP.js";
import { B as x } from "./IconMenu2-BvvTiCnB.js";
import { T as ie, a as le } from "./topbar-DloMbu3D.js";
import { L as l, a as t } from "./list-item-TR_b4pbw.js";
import { t as M } from "./token.css-Cwc-7hPJ.js";
import { c as ne, a as d } from "./atoms.css-WCFmS3R-.js";
import { I as p } from "./IconCheck-Cof-g2Mo.js";
var v = ne("filled", "star-filled", "StarFilled", [
    [
      "path",
      {
        d: "M8.243 7.34l-6.38 .925l-.113 .023a1 1 0 0 0 -.44 1.684l4.622 4.499l-1.09 6.355l-.013 .11a1 1 0 0 0 1.464 .944l5.706 -3l5.693 3l.1 .046a1 1 0 0 0 1.352 -1.1l-1.091 -6.355l4.624 -4.5l.078 -.085a1 1 0 0 0 -.633 -1.62l-6.38 -.926l-2.852 -5.78a1 1 0 0 0 -1.794 0l-2.853 5.78z",
      },
    ],
  ]),
  re = a("<h1>List"),
  de = a("<div style=flex:1>편집 가능한 항목"),
  ce = a("<div style=flex:1>삭제 가능한 항목"),
  se = a("<div style=flex:1>여러 도구"),
  he = a(
    "<div style=overflow:auto;flex:1><h2>List Demo</h2><h3>Basic List</h3><div style=width:300px></div><h3>Selected State</h3><div style=width:300px></div><h3>With Selected Icon (Check Icon)</h3><div style=width:300px></div><h3>With Selected Icon (Star Icon)</h3><div style=width:300px></div><h3>Disabled State</h3><div style=width:300px></div><h3>Inset List</h3><div style=width:300px></div><h3>Accordion Layout (Nested)</h3><div style=width:300px></div><h3>Flat Layout (Nested)</h3><div style=width:300px></div><h3>[Example] Tool</h3><div style=width:300px></div><h3>[Example] Favorite Interactive</h3><p>즐겨찾기: </p><div style=width:300px></div><h3>[Example] Accordion Open Interactive</h3><p>열린 섹션: </p><div style=width:300px>",
  );
function be() {
  const [y, R] = P(["item2"]),
    [m, $] = P(null),
    q = (r) => {
      R((h) => (h.includes(r) ? h.filter((b) => b !== r) : [...h, r]));
    };
  return e(le, {
    get children() {
      return [
        e(ie, {
          get children() {
            var r = re();
            return (V(() => u(r, d({ m: "none", fontSize: "base" }))), r);
          },
        }),
        (() => {
          var r = he(),
            h = r.firstChild,
            b = h.nextSibling,
            _ = b.nextSibling,
            G = _.nextSibling,
            I = G.nextSibling,
            H = I.nextSibling,
            w = H.nextSibling,
            J = w.nextSibling,
            z = J.nextSibling,
            K = z.nextSibling,
            C = K.nextSibling,
            Q = C.nextSibling,
            f = Q.nextSibling,
            U = f.nextSibling,
            L = U.nextSibling,
            X = L.nextSibling,
            F = X.nextSibling,
            Y = F.nextSibling,
            A = Y.nextSibling,
            Z = A.nextSibling,
            c = Z.nextSibling;
          c.firstChild;
          var B = c.nextSibling,
            ee = B.nextSibling,
            s = ee.nextSibling;
          s.firstChild;
          var te = s.nextSibling;
          return (
            n(
              _,
              e(l, {
                get children() {
                  return [
                    e(t, { children: "항목 1" }),
                    e(t, { children: "항목 2" }),
                    e(t, { children: "항목 3" }),
                  ];
                },
              }),
            ),
            n(
              I,
              e(l, {
                get children() {
                  return [
                    e(t, {
                      style: { "justify-content": "flex-start", "align-items": "center" },
                      children: "일반 항목",
                    }),
                    e(t, { selected: !0, children: "선택 항목" }),
                    e(t, { children: "일반 항목" }),
                  ];
                },
              }),
            ),
            n(
              w,
              e(l, {
                get children() {
                  return [
                    e(t, { selectedIcon: p, children: "미선택 항목" }),
                    e(t, { selectedIcon: p, selected: !0, children: "선택된 항목" }),
                    e(t, { selectedIcon: p, children: "미선택 항목" }),
                  ];
                },
              }),
            ),
            n(
              z,
              e(l, {
                get children() {
                  return [
                    e(t, { selectedIcon: v, children: "일반" }),
                    e(t, { selectedIcon: v, selected: !0, children: "즐겨찾기" }),
                    e(t, { selectedIcon: v, children: "일반" }),
                  ];
                },
              }),
            ),
            n(
              C,
              e(l, {
                get children() {
                  return [
                    e(t, { children: "활성 항목" }),
                    e(t, { disabled: !0, children: "비활성 항목" }),
                    e(t, { children: "활성 항목" }),
                  ];
                },
              }),
            ),
            n(
              f,
              e(l, {
                inset: !0,
                get children() {
                  return [
                    e(t, { children: "Inset 항목 1" }),
                    e(t, { children: "Inset 항목 2" }),
                    e(t, { children: "Inset 항목 3" }),
                  ];
                },
              }),
            ),
            n(
              L,
              e(l, {
                get children() {
                  return [
                    e(t, {
                      get children() {
                        return [
                          "폴더 1",
                          e(l, {
                            get children() {
                              return [
                                e(t, { children: "파일 1-1" }),
                                e(t, { children: "파일 1-2" }),
                              ];
                            },
                          }),
                        ];
                      },
                    }),
                    e(t, {
                      get children() {
                        return [
                          "폴더 2",
                          e(l, {
                            get children() {
                              return [
                                e(t, { children: "파일 2-1" }),
                                e(t, {
                                  get children() {
                                    return [
                                      "하위 폴더",
                                      e(l, {
                                        get children() {
                                          return e(t, { children: "파일 2-2-1" });
                                        },
                                      }),
                                    ];
                                  },
                                }),
                              ];
                            },
                          }),
                        ];
                      },
                    }),
                    e(t, { children: "파일 3" }),
                  ];
                },
              }),
            ),
            n(
              F,
              e(l, {
                get children() {
                  return [
                    e(t, {
                      layout: "flat",
                      get children() {
                        return [
                          "카테고리 A",
                          e(l, {
                            get children() {
                              return [
                                e(t, { children: "항목 A-1" }),
                                e(t, { children: "항목 A-2" }),
                              ];
                            },
                          }),
                        ];
                      },
                    }),
                    e(t, {
                      layout: "flat",
                      get children() {
                        return [
                          "카테고리 B",
                          e(l, {
                            get children() {
                              return [
                                e(t, { children: "항목 B-1" }),
                                e(t, { children: "항목 B-2" }),
                                e(t, { children: "항목 B-3" }),
                              ];
                            },
                          }),
                        ];
                      },
                    }),
                  ];
                },
              }),
            ),
            n(
              A,
              e(l, {
                get children() {
                  return [
                    e(t, {
                      get class() {
                        return d({ display: "flex", gap: "xs" });
                      },
                      get children() {
                        return [de(), e(x, { size: "sm", children: "편집" })];
                      },
                    }),
                    e(t, {
                      get class() {
                        return d({ display: "flex", gap: "xs" });
                      },
                      get children() {
                        return [ce(), e(x, { theme: "danger", size: "sm", children: "삭제" })];
                      },
                    }),
                    e(t, {
                      get class() {
                        return d({ display: "flex", gap: "xs" });
                      },
                      get children() {
                        return [
                          se(),
                          e(x, { size: "sm", children: "수정" }),
                          e(x, { theme: "danger", size: "sm", children: "삭제" }),
                        ];
                      },
                    }),
                  ];
                },
              }),
            ),
            n(c, () => y().join(", ") || "없음", null),
            n(
              B,
              e(l, {
                get children() {
                  return e(W, {
                    each: ["item1", "item2", "item3"],
                    children: (i) =>
                      e(t, {
                        selectedIcon: v,
                        get selected() {
                          return y().includes(i);
                        },
                        onClick: () => q(i),
                        children: i,
                      }),
                  });
                },
              }),
            ),
            n(s, () => m() ?? "없음", null),
            n(
              te,
              e(l, {
                get children() {
                  return e(W, {
                    each: ["section1", "section2", "section3"],
                    children: (i) =>
                      e(t, {
                        layout: "accordion",
                        get open() {
                          return m() === i;
                        },
                        onOpenChange: (g) => {
                          g ? $(i) : m() === i && $(null);
                        },
                        get children() {
                          return [
                            i,
                            e(l, {
                              get children() {
                                return [
                                  e(t, { children: "하위 항목 1" }),
                                  e(t, { children: "하위 항목 2" }),
                                ];
                              },
                            }),
                          ];
                        },
                      }),
                  });
                },
              }),
            ),
            V(
              (i) => {
                var g = d({ p: "xxl" }),
                  k = `1px solid rgb(${S.border.base})`,
                  E = d({ mb: "sm" }),
                  T = M.font.size.sm,
                  N = `rgb(${S.text.muted})`,
                  O = d({ mb: "sm" }),
                  j = M.font.size.sm,
                  D = `rgb(${S.text.muted})`;
                return (
                  g !== i.e && u(r, (i.e = g)),
                  k !== i.t && o(f, "border", (i.t = k)),
                  E !== i.a && u(c, (i.a = E)),
                  T !== i.o && o(c, "font-size", (i.o = T)),
                  N !== i.i && o(c, "color", (i.i = N)),
                  O !== i.n && u(s, (i.n = O)),
                  j !== i.s && o(s, "font-size", (i.s = j)),
                  D !== i.h && o(s, "color", (i.h = D)),
                  i
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
              },
            ),
            r
          );
        })(),
      ];
    },
  });
}
export { be as default };
