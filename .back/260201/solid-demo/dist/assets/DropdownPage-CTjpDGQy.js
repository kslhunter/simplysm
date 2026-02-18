import { g as le, c as e, a as _, b as l, i as t, t as m } from "./index-DaQvuWeP.js";
import { B as d } from "./IconMenu2-BvvTiCnB.js";
import { D as o, a as c } from "./dropdown-popup-aAdbNsE4.js";
import { T as ie, a as te } from "./topbar-DloMbu3D.js";
import { L as h, a as n } from "./list-item-TR_b4pbw.js";
import { a as i } from "./atoms.css-WCFmS3R-.js";
import "./constants-Bbx-VEQM.js";
import "./token.css-Cwc-7hPJ.js";
var de = m("<h1>Dropdown"),
  oe = m("<span>서브메뉴 열기 →"),
  ce = m(
    "<div style=overflow:auto;flex:1><h2>Dropdown Demo</h2><section><h3>Basic</h3><p>기본 드롭다운입니다. 클릭하거나 Space/ArrowDown 키로 열 수 있습니다.</p><div></div></section><section><h3>Controlled Mode</h3><p>외부에서 open 상태를 제어합니다. 현재 상태: </p><div></div></section><section><h3>Position Auto-Adjustment</h3><p>뷰포트 위치에 따라 팝업이 상/하, 좌/우로 자동 배치됩니다.</p><div></div></section><section><h3>Nested Dropdown</h3><p>중첩된 드롭다운입니다. 자식 드롭다운이 닫혀도 부모는 유지됩니다.</p></section><section><h3>Keyboard Navigation</h3><p>키보드 단축키:</p><ul><li><kbd>ArrowDown</kbd>: 팝업 열기 / 첫 요소로 포커스</li><li><kbd>ArrowUp</kbd>: 팝업 닫기</li><li><kbd>Space</kbd>: 토글</li><li><kbd>Escape</kbd>: 닫기</li></ul></section><section><h3>Many Dropdowns (Performance Test)</h3><p>100개의 드롭다운입니다. 이벤트 리스너는 팝업이 열릴 때만 등록됩니다.</p><div></div></section><section><h3>Bottom Position Test</h3><p>화면 하단에서 열면 팝업이 위로 배치됩니다.</p><div>",
  ),
  he = m("<div>Dropdown #");
function fe() {
  const [g, p] = le(!1);
  return e(te, {
    get children() {
      return [
        e(ie, {
          get children() {
            var s = de();
            return (_(() => l(s, i({ m: "none", fontSize: "base" }))), s);
          },
        }),
        (() => {
          var s = ce(),
            G = s.firstChild,
            $ = G.nextSibling,
            H = $.firstChild,
            k = H.nextSibling,
            v = k.nextSibling,
            y = $.nextSibling,
            J = y.firstChild,
            b = J.nextSibling;
          b.firstChild;
          var f = b.nextSibling,
            D = y.nextSibling,
            Q = D.firstChild,
            A = Q.nextSibling,
            x = A.nextSibling,
            C = D.nextSibling,
            V = C.firstChild,
            X = V.nextSibling,
            w = C.nextSibling,
            Y = w.firstChild,
            P = Y.nextSibling,
            Z = P.nextSibling,
            T = w.nextSibling,
            ee = T.firstChild,
            W = ee.nextSibling,
            B = W.nextSibling,
            re = T.nextSibling,
            ne = re.firstChild,
            j = ne.nextSibling,
            S = j.nextSibling;
          return (
            t(
              v,
              e(o, {
                get children() {
                  return [
                    e(d, { children: "메뉴 열기" }),
                    e(c, {
                      get children() {
                        return e(h, {
                          get children() {
                            return [
                              e(n, { onClick: () => alert("옵션 1"), children: "옵션 1" }),
                              e(n, { onClick: () => alert("옵션 2"), children: "옵션 2" }),
                              e(n, { onClick: () => alert("옵션 3"), children: "옵션 3" }),
                            ];
                          },
                        });
                      },
                    }),
                  ];
                },
              }),
              null,
            ),
            t(
              v,
              e(o, {
                disabled: !0,
                get children() {
                  return [
                    e(d, { children: "비활성화" }),
                    e(c, {
                      get children() {
                        return e(h, {
                          get children() {
                            return e(n, { children: "이건 열리지 않음" });
                          },
                        });
                      },
                    }),
                  ];
                },
              }),
              null,
            ),
            t(b, () => (g() ? "열림" : "닫힘"), null),
            t(
              f,
              e(d, {
                onClick: () => p(!g()),
                get children() {
                  return g() ? "닫기" : "열기";
                },
              }),
              null,
            ),
            t(
              f,
              e(o, {
                get open() {
                  return g();
                },
                onOpenChange: p,
                get children() {
                  return [
                    e(d, { theme: "primary", children: "Controlled Dropdown" }),
                    e(c, {
                      get children() {
                        return e(h, {
                          get children() {
                            return [
                              e(n, { onClick: () => p(!1), children: "닫기" }),
                              e(n, { onClick: () => alert("작업 실행"), children: "작업 실행" }),
                            ];
                          },
                        });
                      },
                    }),
                  ];
                },
              }),
              null,
            ),
            t(
              x,
              e(o, {
                get children() {
                  return [
                    e(d, { children: "왼쪽 상단" }),
                    e(c, {
                      get children() {
                        return e(h, {
                          get children() {
                            return [
                              e(n, { children: "아이템 1" }),
                              e(n, { children: "아이템 2" }),
                              e(n, { children: "아이템 3" }),
                            ];
                          },
                        });
                      },
                    }),
                  ];
                },
              }),
              null,
            ),
            t(
              x,
              e(o, {
                get children() {
                  return [
                    e(d, { children: "오른쪽 상단" }),
                    e(c, {
                      get children() {
                        return e(h, {
                          get children() {
                            return [
                              e(n, { children: "아이템 1" }),
                              e(n, { children: "아이템 2" }),
                              e(n, { children: "아이템 3" }),
                            ];
                          },
                        });
                      },
                    }),
                  ];
                },
              }),
              null,
            ),
            t(
              C,
              e(o, {
                get children() {
                  return [
                    e(d, { theme: "primary", children: "메인 메뉴" }),
                    e(c, {
                      get children() {
                        return e(h, {
                          get children() {
                            return [
                              e(n, { onClick: () => alert("메뉴 1"), children: "메뉴 1" }),
                              e(n, {
                                get children() {
                                  return e(o, {
                                    get children() {
                                      return [
                                        oe(),
                                        e(c, {
                                          get children() {
                                            return e(h, {
                                              get children() {
                                                return [
                                                  e(n, {
                                                    onClick: () => alert("서브 1"),
                                                    children: "서브 아이템 1",
                                                  }),
                                                  e(n, {
                                                    onClick: () => alert("서브 2"),
                                                    children: "서브 아이템 2",
                                                  }),
                                                  e(n, {
                                                    onClick: () => alert("서브 3"),
                                                    children: "서브 아이템 3",
                                                  }),
                                                ];
                                              },
                                            });
                                          },
                                        }),
                                      ];
                                    },
                                  });
                                },
                              }),
                              e(n, { onClick: () => alert("메뉴 3"), children: "메뉴 3" }),
                            ];
                          },
                        });
                      },
                    }),
                  ];
                },
              }),
              null,
            ),
            t(
              w,
              e(o, {
                get children() {
                  return [
                    e(d, { children: "키보드로 조작해보세요" }),
                    e(c, {
                      get children() {
                        return e(h, {
                          get children() {
                            return [
                              e(n, { children: "포커스 가능 1" }),
                              e(n, { children: "포커스 가능 2" }),
                              e(n, { children: "포커스 가능 3" }),
                            ];
                          },
                        });
                      },
                    }),
                  ];
                },
              }),
              null,
            ),
            t(B, () =>
              Array.from({ length: 100 }, (r, u) =>
                e(o, {
                  get children() {
                    return [
                      e(d, { size: "xs", children: u + 1 }),
                      e(c, {
                        get children() {
                          var a = he();
                          return (
                            a.firstChild,
                            t(a, u + 1, null),
                            _(() => l(a, i({ p: "base" }))),
                            a
                          );
                        },
                      }),
                    ];
                  },
                }),
              ),
            ),
            t(
              S,
              e(o, {
                get children() {
                  return [
                    e(d, { children: "왼쪽 하단" }),
                    e(c, {
                      get children() {
                        return e(h, {
                          get children() {
                            return [
                              e(n, { children: "위로 배치됨 1" }),
                              e(n, { children: "위로 배치됨 2" }),
                              e(n, { children: "위로 배치됨 3" }),
                            ];
                          },
                        });
                      },
                    }),
                  ];
                },
              }),
              null,
            ),
            t(
              S,
              e(o, {
                get children() {
                  return [
                    e(d, { children: "오른쪽 하단" }),
                    e(c, {
                      get children() {
                        return e(h, {
                          get children() {
                            return [
                              e(n, { children: "위로 배치됨 1" }),
                              e(n, { children: "위로 배치됨 2" }),
                              e(n, { children: "위로 배치됨 3" }),
                            ];
                          },
                        });
                      },
                    }),
                  ];
                },
              }),
              null,
            ),
            _(
              (r) => {
                var u = i({ p: "xxl" }),
                  a = i({ mb: "base", color: "muted" }),
                  L = i({ display: "flex", gap: "base", flexWrap: "wrap" }),
                  N = i({ mb: "base", color: "muted" }),
                  z = i({ display: "flex", gap: "base", flexWrap: "wrap" }),
                  E = i({ mb: "base", color: "muted" }),
                  M = i({
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "base",
                  }),
                  I = i({ mb: "base", color: "muted" }),
                  K = i({ mb: "base", color: "muted" }),
                  O = i({ mb: "lg", color: "muted" }),
                  R = i({ mb: "base", color: "muted" }),
                  U = i({ display: "flex", gap: "xs", flexWrap: "wrap" }),
                  q = i({ mb: "base", color: "muted" }),
                  F = i({
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "base",
                  });
                return (
                  u !== r.e && l(s, (r.e = u)),
                  a !== r.t && l(k, (r.t = a)),
                  L !== r.a && l(v, (r.a = L)),
                  N !== r.o && l(b, (r.o = N)),
                  z !== r.i && l(f, (r.i = z)),
                  E !== r.n && l(A, (r.n = E)),
                  M !== r.s && l(x, (r.s = M)),
                  I !== r.h && l(X, (r.h = I)),
                  K !== r.r && l(P, (r.r = K)),
                  O !== r.d && l(Z, (r.d = O)),
                  R !== r.l && l(W, (r.l = R)),
                  U !== r.u && l(B, (r.u = U)),
                  q !== r.c && l(j, (r.c = q)),
                  F !== r.w && l(S, (r.w = F)),
                  r
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
                l: void 0,
                u: void 0,
                c: void 0,
                w: void 0,
              },
            ),
            s
          );
        })(),
      ];
    },
  });
}
export { fe as default };
