import {
  f as Ee,
  o as it,
  p as ot,
  j as Ke,
  m as Ne,
  i as u,
  c as t,
  F as P,
  t as a,
  g as y,
  k as z,
  n as dt,
  a as d,
  b as r,
  s as b,
  d as p,
} from "./index-DaQvuWeP.js";
import { c as ke, b as ye, S as De, a as Ie, I as at } from "./sidebar-menu-Cz0ipkzh.js";
import { T as v, a as m } from "./topbar-DloMbu3D.js";
import { c as D, a as l } from "./atoms.css-WCFmS3R-.js";
import { D as qe, u as Ae, a as Be } from "./dropdown-popup-aAdbNsE4.js";
import { B as Ge } from "./IconMenu2-BvvTiCnB.js";
import { L as O, a as He } from "./list-item-TR_b4pbw.js";
/* empty css                              */ import {
  a as Re,
  I as We,
} from "./IconSettings-DZK_D65a.js";
import "./constants-Bbx-VEQM.js";
import "./token.css-Cwc-7hPJ.js";
var st = D("outline", "chevron-down", "ChevronDown", [["path", { d: "M6 9l6 6l6 -6" }]]);
var ct = D("outline", "database", "Database", [
  ["path", { d: "M4 6a8 3 0 1 0 16 0a8 3 0 1 0 -16 0" }],
  ["path", { d: "M4 6v6a8 3 0 0 0 16 0v-6" }],
  ["path", { d: "M4 12v6a8 3 0 0 0 16 0v-6" }],
]);
var ut = D("outline", "server", "Server", [
  ["path", { d: "M3 7a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v2a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3" }],
  [
    "path",
    { d: "M3 15a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v2a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3l0 -2" },
  ],
  ["path", { d: "M7 8l0 .01" }],
  ["path", { d: "M7 16l0 .01" }],
]);
var ht = D("outline", "users", "Users", [
    ["path", { d: "M5 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" }],
    ["path", { d: "M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" }],
    ["path", { d: "M16 3.13a4 4 0 0 1 0 7.75" }],
    ["path", { d: "M21 21v-2a4 4 0 0 0 -3 -3.85" }],
  ]),
  gt = "_1ezlc6q0",
  vt = "_1ezlc6q1",
  mt = a("<nav>"),
  bt = a("<span>");
const ze = (n) => {
    const [i, s] = Ee(n, ["menus", "isSelectedFn", "class"]),
      S = it(),
      g = ot(),
      C = (c) => (i.isSelectedFn ? i.isSelectedFn(c) : c.path != null && S.pathname === c.path),
      w = (c, f, x) => {
        if (c.url != null) {
          (window.open(c.url, "_blank"), x());
          return;
        }
        c.path != null &&
          (f.ctrlKey || f.altKey
            ? window.open(ke(c.path), "_blank")
            : f.shiftKey
              ? window.open(ke(c.path), "_blank", "width=800,height=800")
              : g(c.path),
          x());
      };
    return (() => {
      var c = mt();
      return (
        Ke(
          c,
          Ne(s, {
            get class() {
              return [gt, i.class].filterExists().join(" ");
            },
          }),
          !1,
          !0,
        ),
        u(
          c,
          t(P, {
            get each() {
              return i.menus;
            },
            children: (f) => t(pt, { menu: f, isSelected: C, onMenuClick: w }),
          }),
        ),
        c
      );
    })();
  },
  pt = (n) => {
    const [i, s] = y(!1);
    return t(qe, {
      get open() {
        return i();
      },
      onOpenChange: s,
      get children() {
        return [
          t($t, {
            get menu() {
              return n.menu;
            },
          }),
          t(_t, {
            get menus() {
              return n.menu.children ?? [];
            },
            get isSelected() {
              return n.isSelected;
            },
            get onMenuClick() {
              return n.onMenuClick;
            },
          }),
        ];
      },
    });
  },
  $t = (n) =>
    t(Ge, {
      link: !0,
      get children() {
        return [
          t(z, {
            get when() {
              return n.menu.icon;
            },
            children: (i) => i()({ size: 18 }),
          }),
          dt(() => n.menu.title),
          t(st, { size: 16 }),
        ];
      },
    }),
  _t = (n) => {
    const i = Ae();
    return t(Be, {
      get children() {
        return t(O, {
          inset: !0,
          get children() {
            return t(Ve, {
              get menus() {
                return n.menus;
              },
              depth: 0,
              get isSelected() {
                return n.isSelected;
              },
              get onMenuClick() {
                return n.onMenuClick;
              },
              closeDropdown: () => i?.close(),
            });
          },
        });
      },
    });
  },
  Ve = (n) =>
    t(P, {
      get each() {
        return n.menus;
      },
      children: (i) =>
        t(He, {
          layout: "flat",
          get selected() {
            return n.isSelected(i);
          },
          get style() {
            return { "text-indent": `${n.depth > 0 ? (n.depth + 1) * 0.5 : 0}rem` };
          },
          get class() {
            return l({ gap: "xs" });
          },
          onClick: (s) => n.onMenuClick(i, s, n.closeDropdown),
          get children() {
            return [
              t(z, {
                get when() {
                  return i.icon;
                },
                children: (s) => s()({ size: 16 }),
              }),
              (() => {
                var s = bt();
                return (u(s, () => i.title), s);
              })(),
              t(z, {
                get when() {
                  return i.children?.length;
                },
                get children() {
                  return t(O, {
                    inset: !0,
                    class: vt,
                    get children() {
                      return t(Ve, {
                        get menus() {
                          return i.children;
                        },
                        get depth() {
                          return n.depth + 1;
                        },
                        get isSelected() {
                          return n.isSelected;
                        },
                        get onMenuClick() {
                          return n.onMenuClick;
                        },
                        get closeDropdown() {
                          return n.closeDropdown;
                        },
                      });
                    },
                  });
                },
              }),
            ];
          },
        }),
    });
var ft = "sj2llk0",
  Ct = a("<div>");
const T = (n) => {
    const [i, s] = Ee(n, ["menus", "children", "class"]),
      [S, g] = y(!1);
    return (() => {
      var C = Ct();
      return (
        Ke(
          C,
          Ne(s, {
            get class() {
              return [ft, i.class].filterExists().join(" ");
            },
          }),
          !1,
          !0,
        ),
        u(
          C,
          t(qe, {
            get open() {
              return S();
            },
            onOpenChange: g,
            get children() {
              return [
                t(Ge, {
                  link: !0,
                  get children() {
                    return i.children;
                  },
                }),
                t(St, {
                  get menus() {
                    return i.menus;
                  },
                }),
              ];
            },
          }),
        ),
        C
      );
    })();
  },
  St = (n) => {
    const i = Ae();
    return t(Be, {
      get children() {
        return t(O, {
          get children() {
            return t(P, {
              get each() {
                return n.menus;
              },
              children: (s) =>
                t(He, {
                  onClick: () => {
                    (s.onClick(), i?.close());
                  },
                  get children() {
                    return s.title;
                  },
                }),
            });
          },
        });
      },
    });
  };
var $ = "_1mrl44b0",
  _ = "_1mrl44b1",
  xt = "_1mrl44b2",
  M = "_1mrl44b3",
  wt = a("<h1>Topbar"),
  Tt = a("<h1>페이지 제목"),
  Mt = a("<div><p>메인 콘텐츠 영역"),
  kt = a("<h1>토글 버튼 없음"),
  Pe = a("<div><p>콘텐츠 영역"),
  yt = a("<h1>토글 버튼 있음"),
  Dt = a("<div><p>메뉴를 클릭해보세요"),
  It = a("<div><p>관리 → 시스템 → 고급 설정을 확인해보세요"),
  Oe = a("<h1>제목"),
  k = a("<div style=flex:1>"),
  zt = a("<div><p>메뉴 없이 이름만 표시"),
  Pt = a("<div><p>클릭하면 프로필/로그아웃 메뉴 표시"),
  Le = a("<div>LOGO"),
  Ue = a("<h1>페이지"),
  Fe = a("<div><p>토글 버튼을 클릭해보세요"),
  Ot = a(
    '<div style=overflow:auto;flex:1><h2>Topbar Demo</h2><section><h3>TopbarContainer 기본</h3><p>TopbarContainer는 Topbar + 콘텐츠를 수직으로 배치합니다.</p><div></div></section><section><h3>Topbar 토글 버튼</h3><p>showToggle prop으로 사이드바 토글 버튼 표시를 제어합니다. SidebarContext 없이는 클릭해도 동작하지 않습니다.</p><div><div><p>showToggle=false</p><div></div></div><div><p>showToggle=true</p><div></div></div></div></section><section><h3>TopbarMenu 변형</h3><p>TopbarMenu는 드롭다운 메뉴를 제공합니다. 무제한 중첩을 지원합니다.</p><div><div><p>단순 메뉴 (2단계)</p><div></div></div><div><p>중첩 메뉴 (3단계 이상, 아이콘 포함)</p><div></div></div></div></section><section><h3>TopbarUser 변형</h3><p>TopbarUser는 사용자 메뉴 드롭다운을 제공합니다.</p><div><div><p>기본 (이름만)</p><div></div></div><div><p>메뉴 포함</p><div></div></div></div></section><section><h3>Sidebar + Topbar 통합</h3><p>SidebarContainer 내부에서 TopbarContainer를 사용하면 토글 버튼이 자동으로 연동됩니다.</p><div><div><p>사이드바 열림 (toggled=false)</p><div></div></div><div><p>사이드바 닫힘 (toggled=true)</p><div></div></div></div></section><section><h3>모바일 데모</h3><p>375px x 500px iframe으로 모바일 환경 시뮬레이션</p><div><iframe src=#/mobile-layout-demo title="Mobile Layout Demo"style=width:100%;height:100%;border:none>',
  );
const Lt = [
    { title: "관리", children: [{ title: "사용자 관리" }, { title: "권한 설정" }] },
    { title: "도움말", children: [{ title: "가이드" }, { title: "정보" }] },
  ],
  Ut = [
    {
      title: "관리",
      icon: Re,
      children: [
        { title: "사용자 관리", icon: ht },
        {
          title: "시스템",
          icon: ut,
          children: [
            { title: "서버 설정" },
            { title: "데이터베이스", icon: ct },
            { title: "고급 설정", children: [{ title: "캐시" }, { title: "로그" }] },
          ],
        },
      ],
    },
    { title: "문서", icon: We, children: [{ title: "시작하기" }, { title: "API 참조" }] },
  ],
  I = [
    { title: "프로필", onClick: () => alert("프로필") },
    { title: "로그아웃", onClick: () => alert("로그아웃") },
  ],
  je = [
    { title: "홈", path: "#", icon: at },
    {
      title: "문서",
      icon: We,
      children: [
        { title: "시작하기", path: "#" },
        { title: "API 참조", path: "#" },
      ],
    },
    { title: "설정", path: "#", icon: Re },
  ];
function Wt() {
  const [n, i] = y(!1),
    [s, S] = y(!0);
  return t(m, {
    get children() {
      return [
        t(v, {
          get children() {
            var g = wt();
            return (d(() => r(g, l({ m: "none", fontSize: "base" }))), g);
          },
        }),
        (() => {
          var g = Ot(),
            C = g.firstChild,
            w = C.nextSibling,
            c = w.firstChild,
            f = c.nextSibling,
            x = f.nextSibling,
            L = w.nextSibling,
            Je = L.firstChild,
            U = Je.nextSibling,
            F = U.nextSibling,
            j = F.firstChild,
            E = j.firstChild,
            K = E.nextSibling,
            Qe = j.nextSibling,
            N = Qe.firstChild,
            q = N.nextSibling,
            A = L.nextSibling,
            Xe = A.firstChild,
            B = Xe.nextSibling,
            G = B.nextSibling,
            H = G.firstChild,
            R = H.firstChild,
            W = R.nextSibling,
            Ye = H.nextSibling,
            V = Ye.firstChild,
            J = V.nextSibling,
            Q = A.nextSibling,
            Ze = Q.firstChild,
            X = Ze.nextSibling,
            Y = X.nextSibling,
            Z = Y.firstChild,
            ee = Z.firstChild,
            te = ee.nextSibling,
            et = Z.nextSibling,
            re = et.firstChild,
            ne = re.nextSibling,
            le = Q.nextSibling,
            tt = le.firstChild,
            ie = tt.nextSibling,
            oe = ie.nextSibling,
            de = oe.firstChild,
            ae = de.firstChild,
            se = ae.nextSibling,
            rt = de.nextSibling,
            ce = rt.firstChild,
            ue = ce.nextSibling,
            nt = le.nextSibling,
            lt = nt.firstChild,
            he = lt.nextSibling,
            ge = he.nextSibling;
          return (
            ge.firstChild,
            r(x, $),
            u(
              x,
              t(m, {
                get children() {
                  return [
                    t(v, {
                      showToggle: !1,
                      get children() {
                        var e = Tt();
                        return (d(() => r(e, l({ m: "none", fontSize: "base" }))), e);
                      },
                    }),
                    (() => {
                      var e = Mt(),
                        o = e.firstChild;
                      return (r(e, _), d((h) => b(o, "color", `rgb(${p.text.muted})`)), e);
                    })(),
                  ];
                },
              }),
            ),
            r(F, M),
            r(K, $),
            u(
              K,
              t(m, {
                get children() {
                  return [
                    t(v, {
                      showToggle: !1,
                      get children() {
                        var e = kt();
                        return (d(() => r(e, l({ m: "none", fontSize: "base" }))), e);
                      },
                    }),
                    (() => {
                      var e = Pe(),
                        o = e.firstChild;
                      return (r(e, _), d((h) => b(o, "color", `rgb(${p.text.muted})`)), e);
                    })(),
                  ];
                },
              }),
            ),
            r(q, $),
            u(
              q,
              t(m, {
                get children() {
                  return [
                    t(v, {
                      showToggle: !0,
                      get children() {
                        var e = yt();
                        return (d(() => r(e, l({ m: "none", fontSize: "base" }))), e);
                      },
                    }),
                    (() => {
                      var e = Pe(),
                        o = e.firstChild;
                      return (r(e, _), d((h) => b(o, "color", `rgb(${p.text.muted})`)), e);
                    })(),
                  ];
                },
              }),
            ),
            r(G, M),
            r(W, $),
            u(
              W,
              t(m, {
                get children() {
                  return [
                    t(v, {
                      showToggle: !1,
                      get children() {
                        return t(ze, { menus: Lt });
                      },
                    }),
                    (() => {
                      var e = Dt(),
                        o = e.firstChild;
                      return (r(e, _), d((h) => b(o, "color", `rgb(${p.text.muted})`)), e);
                    })(),
                  ];
                },
              }),
            ),
            r(J, $),
            u(
              J,
              t(m, {
                get children() {
                  return [
                    t(v, {
                      showToggle: !1,
                      get children() {
                        return t(ze, { menus: Ut });
                      },
                    }),
                    (() => {
                      var e = It(),
                        o = e.firstChild;
                      return (r(e, _), d((h) => b(o, "color", `rgb(${p.text.muted})`)), e);
                    })(),
                  ];
                },
              }),
            ),
            r(Y, M),
            r(te, $),
            u(
              te,
              t(m, {
                get children() {
                  return [
                    t(v, {
                      showToggle: !1,
                      get children() {
                        return [
                          (() => {
                            var e = Oe();
                            return (d(() => r(e, l({ m: "none", fontSize: "base" }))), e);
                          })(),
                          k(),
                          t(T, { menus: [], children: "홍길동" }),
                        ];
                      },
                    }),
                    (() => {
                      var e = zt(),
                        o = e.firstChild;
                      return (r(e, _), d((h) => b(o, "color", `rgb(${p.text.muted})`)), e);
                    })(),
                  ];
                },
              }),
            ),
            r(ne, $),
            u(
              ne,
              t(m, {
                get children() {
                  return [
                    t(v, {
                      showToggle: !1,
                      get children() {
                        return [
                          (() => {
                            var e = Oe();
                            return (d(() => r(e, l({ m: "none", fontSize: "base" }))), e);
                          })(),
                          k(),
                          t(T, { menus: I, children: "홍길동" }),
                        ];
                      },
                    }),
                    (() => {
                      var e = Pt(),
                        o = e.firstChild;
                      return (r(e, _), d((h) => b(o, "color", `rgb(${p.text.muted})`)), e);
                    })(),
                  ];
                },
              }),
            ),
            r(oe, M),
            r(se, $),
            u(
              se,
              t(ye, {
                get toggled() {
                  return n();
                },
                onToggledChange: i,
                get children() {
                  return [
                    t(De, {
                      get children() {
                        return [
                          (() => {
                            var e = Le();
                            return (d(() => r(e, l({ p: "base", fontWeight: "bold" }))), e);
                          })(),
                          t(Ie, { menus: je, layout: "flat" }),
                        ];
                      },
                    }),
                    t(m, {
                      get children() {
                        return [
                          t(v, {
                            get children() {
                              return [
                                (() => {
                                  var e = Ue();
                                  return (d(() => r(e, l({ m: "none", fontSize: "base" }))), e);
                                })(),
                                k(),
                                t(T, { menus: I, children: "홍길동" }),
                              ];
                            },
                          }),
                          (() => {
                            var e = Fe(),
                              o = e.firstChild;
                            return (r(e, _), d((h) => b(o, "color", `rgb(${p.text.muted})`)), e);
                          })(),
                        ];
                      },
                    }),
                  ];
                },
              }),
            ),
            r(ue, $),
            u(
              ue,
              t(ye, {
                get toggled() {
                  return s();
                },
                onToggledChange: S,
                get children() {
                  return [
                    t(De, {
                      get children() {
                        return [
                          (() => {
                            var e = Le();
                            return (d(() => r(e, l({ p: "base", fontWeight: "bold" }))), e);
                          })(),
                          t(Ie, { menus: je, layout: "flat" }),
                        ];
                      },
                    }),
                    t(m, {
                      get children() {
                        return [
                          t(v, {
                            get children() {
                              return [
                                (() => {
                                  var e = Ue();
                                  return (d(() => r(e, l({ m: "none", fontSize: "base" }))), e);
                                })(),
                                k(),
                                t(T, { menus: I, children: "홍길동" }),
                              ];
                            },
                          }),
                          (() => {
                            var e = Fe(),
                              o = e.firstChild;
                            return (r(e, _), d((h) => b(o, "color", `rgb(${p.text.muted})`)), e);
                          })(),
                        ];
                      },
                    }),
                  ];
                },
              }),
            ),
            r(ge, xt),
            d(
              (e) => {
                var o = l({ p: "xxl" }),
                  h = l({ mb: "base", color: "muted" }),
                  ve = l({ mb: "base", color: "muted" }),
                  me = l({ mb: "sm", color: "muted" }),
                  be = l({ mb: "sm", color: "muted" }),
                  pe = l({ mb: "base", color: "muted" }),
                  $e = l({ mb: "sm", color: "muted" }),
                  _e = l({ mb: "sm", color: "muted" }),
                  fe = l({ mb: "base", color: "muted" }),
                  Ce = l({ mb: "sm", color: "muted" }),
                  Se = l({ mb: "sm", color: "muted" }),
                  xe = l({ mb: "base", color: "muted" }),
                  we = l({ mb: "sm", color: "muted" }),
                  Te = l({ mb: "sm", color: "muted" }),
                  Me = l({ mb: "base", color: "muted" });
                return (
                  o !== e.e && r(g, (e.e = o)),
                  h !== e.t && r(f, (e.t = h)),
                  ve !== e.a && r(U, (e.a = ve)),
                  me !== e.o && r(E, (e.o = me)),
                  be !== e.i && r(N, (e.i = be)),
                  pe !== e.n && r(B, (e.n = pe)),
                  $e !== e.s && r(R, (e.s = $e)),
                  _e !== e.h && r(V, (e.h = _e)),
                  fe !== e.r && r(X, (e.r = fe)),
                  Ce !== e.d && r(ee, (e.d = Ce)),
                  Se !== e.l && r(re, (e.l = Se)),
                  xe !== e.u && r(ie, (e.u = xe)),
                  we !== e.c && r(ae, (e.c = we)),
                  Te !== e.w && r(ce, (e.w = Te)),
                  Me !== e.m && r(he, (e.m = Me)),
                  e
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
                m: void 0,
              },
            ),
            g
          );
        })(),
      ];
    },
  });
}
export { Wt as default };
