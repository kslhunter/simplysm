import {
  g as ue,
  c as r,
  a as n,
  b as t,
  i as d,
  F as he,
  s as m,
  d as v,
  t as s,
} from "./index-DaQvuWeP.js";
import { B as be } from "./IconMenu2-BvvTiCnB.js";
import { b as u, S as h, a as b, I as $e } from "./sidebar-menu-Cz0ipkzh.js";
import { S as te } from "./sidebar-user-CUCHQprk.js";
import { T as ce, a as ge } from "./topbar-DloMbu3D.js";
import { a as i } from "./atoms.css-WCFmS3R-.js";
/* empty css                              */ import {
  I as _e,
  a as fe,
} from "./IconSettings-DZK_D65a.js";
import "./list-item-TR_b4pbw.js";
import "./token.css-Cwc-7hPJ.js";
import "./constants-Bbx-VEQM.js";
var $ = "_1yk87jr0",
  c = "_1yk87jr1",
  pe = "_1yk87jr2",
  k = "_1yk87jr3",
  Se = s("<h1>Sidebar"),
  g = s("<div>LOGO"),
  I = s("<div><p>메인 콘텐츠 영역"),
  xe = s("<div><p>토글 버튼으로 사이드바 숨김/표시 전환"),
  Ce = s("<div><p>SidebarUser 없음"),
  ye = s("<div><p>기본 SidebarUser"),
  We = s("<div><p>메뉴 포함 SidebarUser"),
  ke = s(
    '<div style=overflow:auto;flex:1><h2>Sidebar Demo</h2><section><h3>Width 변형</h3><div></div></section><section><h3>Layout 변형</h3><div><div><p>Accordion (기본)</p><div></div></div><div><p>Flat</p><div></div></div></div></section><section><h3>Toggled 상태</h3><div><span>toggled: </span></div><div></div></section><section><h3>SidebarUser 변형</h3><div><div><p>없음</p><div></div></div><div><p>기본</p><div></div></div><div><p>메뉴 포함</p><div></div></div></div></section><section><h3>모바일 데모</h3><p>375px x 500px iframe으로 모바일 환경 시뮬레이션</p><div><iframe src=#/mobile-layout-demo title="Mobile Sidebar Demo"style=width:100%;height:100%;border:none>',
  ),
  Ie = s("<div><p></p><div>");
const _ = [
  { title: "홈", path: "#", icon: $e },
  {
    title: "문서",
    icon: _e,
    children: [
      { title: "시작하기", path: "#" },
      { title: "API 참조", path: "#" },
    ],
  },
  { title: "설정", path: "#", icon: fe },
];
function Ge() {
  const re = [
      { label: "좁게 (12rem)", value: "12rem" },
      { label: "기본 (16rem)", value: "16rem" },
      { label: "넓게 (20rem)", value: "20rem" },
    ],
    [y, T] = ue(!1);
  return r(ge, {
    get children() {
      return [
        r(ce, {
          get children() {
            var f = Se();
            return (n(() => t(f, i({ m: "none", fontSize: "base" }))), f);
          },
        }),
        (() => {
          var f = ke(),
            ie = f.firstChild,
            U = ie.nextSibling,
            le = U.firstChild,
            j = le.nextSibling,
            w = U.nextSibling,
            ne = w.firstChild,
            D = ne.nextSibling,
            F = D.firstChild,
            M = F.firstChild,
            O = M.nextSibling,
            oe = F.nextSibling,
            P = oe.firstChild,
            A = P.nextSibling,
            B = w.nextSibling,
            de = B.firstChild,
            S = de.nextSibling,
            x = S.firstChild;
          x.firstChild;
          var G = S.nextSibling,
            L = B.nextSibling,
            ae = L.firstChild,
            z = ae.nextSibling,
            E = z.firstChild,
            H = E.firstChild,
            N = H.nextSibling,
            R = E.nextSibling,
            V = R.firstChild,
            q = V.nextSibling,
            se = R.nextSibling,
            J = se.firstChild,
            K = J.nextSibling,
            me = L.nextSibling,
            ve = me.firstChild,
            Q = ve.nextSibling,
            X = Q.nextSibling;
          return (
            X.firstChild,
            t(j, k),
            d(
              j,
              r(he, {
                each: re,
                children: (e) =>
                  (() => {
                    var l = Ie(),
                      o = l.firstChild,
                      p = o.nextSibling;
                    return (
                      d(o, () => e.label),
                      t(p, $),
                      d(
                        p,
                        r(u, {
                          get width() {
                            return e.value;
                          },
                          get children() {
                            return [
                              r(h, {
                                get children() {
                                  return [
                                    (() => {
                                      var a = g();
                                      return (
                                        n(() => t(a, i({ p: "base", fontWeight: "bold" }))),
                                        a
                                      );
                                    })(),
                                    r(b, { menus: _, layout: "flat" }),
                                  ];
                                },
                              }),
                              (() => {
                                var a = I(),
                                  C = a.firstChild;
                                return (
                                  t(a, c),
                                  n((W) => m(C, "color", `rgb(${v.text.muted})`)),
                                  a
                                );
                              })(),
                            ];
                          },
                        }),
                      ),
                      n(() => t(o, i({ mb: "sm", color: "muted" }))),
                      l
                    );
                  })(),
              }),
            ),
            t(D, k),
            t(O, $),
            d(
              O,
              r(u, {
                get children() {
                  return [
                    r(h, {
                      get children() {
                        return [
                          (() => {
                            var e = g();
                            return (n(() => t(e, i({ p: "base", fontWeight: "bold" }))), e);
                          })(),
                          r(b, { menus: _, layout: "accordion" }),
                        ];
                      },
                    }),
                    (() => {
                      var e = I(),
                        l = e.firstChild;
                      return (t(e, c), n((o) => m(l, "color", `rgb(${v.text.muted})`)), e);
                    })(),
                  ];
                },
              }),
            ),
            t(A, $),
            d(
              A,
              r(u, {
                get children() {
                  return [
                    r(h, {
                      get children() {
                        return [
                          (() => {
                            var e = g();
                            return (n(() => t(e, i({ p: "base", fontWeight: "bold" }))), e);
                          })(),
                          r(b, { menus: _, layout: "flat" }),
                        ];
                      },
                    }),
                    (() => {
                      var e = I(),
                        l = e.firstChild;
                      return (t(e, c), n((o) => m(l, "color", `rgb(${v.text.muted})`)), e);
                    })(),
                  ];
                },
              }),
            ),
            d(
              S,
              r(be, {
                onClick: () => T((e) => !e),
                get children() {
                  return y() ? "사이드바 표시" : "사이드바 숨기기";
                },
              }),
              x,
            ),
            d(x, () => (y() ? "true" : "false"), null),
            t(G, $),
            d(
              G,
              r(u, {
                get toggled() {
                  return y();
                },
                onToggledChange: T,
                get children() {
                  return [
                    r(h, {
                      get children() {
                        return [
                          (() => {
                            var e = g();
                            return (n(() => t(e, i({ p: "base", fontWeight: "bold" }))), e);
                          })(),
                          r(b, { menus: _, layout: "flat" }),
                        ];
                      },
                    }),
                    (() => {
                      var e = xe(),
                        l = e.firstChild;
                      return (t(e, c), n((o) => m(l, "color", `rgb(${v.text.muted})`)), e);
                    })(),
                  ];
                },
              }),
            ),
            t(z, k),
            t(N, $),
            d(
              N,
              r(u, {
                get children() {
                  return [
                    r(h, {
                      get children() {
                        return [
                          (() => {
                            var e = g();
                            return (n(() => t(e, i({ p: "base", fontWeight: "bold" }))), e);
                          })(),
                          r(b, { menus: _, layout: "flat" }),
                        ];
                      },
                    }),
                    (() => {
                      var e = Ce(),
                        l = e.firstChild;
                      return (t(e, c), n((o) => m(l, "color", `rgb(${v.text.muted})`)), e);
                    })(),
                  ];
                },
              }),
            ),
            t(q, $),
            d(
              q,
              r(u, {
                get children() {
                  return [
                    r(h, {
                      get children() {
                        return [
                          (() => {
                            var e = g();
                            return (n(() => t(e, i({ p: "base", fontWeight: "bold" }))), e);
                          })(),
                          r(te, { name: "홍길동", description: "user@example.com" }),
                          r(b, { menus: _, layout: "flat" }),
                        ];
                      },
                    }),
                    (() => {
                      var e = ye(),
                        l = e.firstChild;
                      return (t(e, c), n((o) => m(l, "color", `rgb(${v.text.muted})`)), e);
                    })(),
                  ];
                },
              }),
            ),
            t(K, $),
            d(
              K,
              r(u, {
                get children() {
                  return [
                    r(h, {
                      get children() {
                        return [
                          (() => {
                            var e = g();
                            return (n(() => t(e, i({ p: "base", fontWeight: "bold" }))), e);
                          })(),
                          r(te, {
                            name: "홍길동",
                            description: "admin@example.com",
                            menus: [
                              { title: "프로필", onClick: () => alert("프로필") },
                              { title: "로그아웃", onClick: () => alert("로그아웃") },
                            ],
                          }),
                          r(b, { menus: _, layout: "flat" }),
                        ];
                      },
                    }),
                    (() => {
                      var e = We(),
                        l = e.firstChild;
                      return (t(e, c), n((o) => m(l, "color", `rgb(${v.text.muted})`)), e);
                    })(),
                  ];
                },
              }),
            ),
            t(X, pe),
            n(
              (e) => {
                var l = i({ p: "xxl" }),
                  o = i({ mb: "sm", color: "muted" }),
                  p = i({ mb: "sm", color: "muted" }),
                  a = i({ mb: "base" }),
                  C = i({ ml: "base", color: "muted" }),
                  W = i({ mb: "sm", color: "muted" }),
                  Y = i({ mb: "sm", color: "muted" }),
                  Z = i({ mb: "sm", color: "muted" }),
                  ee = i({ mb: "base", color: "muted" });
                return (
                  l !== e.e && t(f, (e.e = l)),
                  o !== e.t && t(M, (e.t = o)),
                  p !== e.a && t(P, (e.a = p)),
                  a !== e.o && t(S, (e.o = a)),
                  C !== e.i && t(x, (e.i = C)),
                  W !== e.n && t(H, (e.n = W)),
                  Y !== e.s && t(V, (e.s = Y)),
                  Z !== e.h && t(J, (e.h = Z)),
                  ee !== e.r && t(Q, (e.r = ee)),
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
              },
            ),
            f
          );
        })(),
      ];
    },
  });
}
export { Ge as default };
