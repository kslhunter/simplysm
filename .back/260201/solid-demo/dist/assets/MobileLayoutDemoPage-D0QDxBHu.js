import {
  g as M,
  i as k,
  c as a,
  a as d,
  b as s,
  s as i,
  d as o,
  t as m,
} from "./index-DaQvuWeP.js";
import { B as _, I as P } from "./IconMenu2-BvvTiCnB.js";
import { S as B, a as O, I as T, b as V } from "./sidebar-menu-Cz0ipkzh.js";
import { S as W } from "./sidebar-user-CUCHQprk.js";
import { t as w } from "./token.css-Cwc-7hPJ.js";
import { a as n } from "./atoms.css-WCFmS3R-.js";
import { I as z, a as A } from "./IconSettings-DZK_D65a.js";
/* empty css                              */ import "./list-item-TR_b4pbw.js";
import "./constants-Bbx-VEQM.js";
var D = m("<div>LOGO"),
  E = m(
    "<main style=height:100%;overflow:auto><header style=display:flex;align-items:center><span>모바일 데모</span></header><div><p>햄버거 버튼을 클릭하여 사이드바를 열 수 있습니다.</p><p>사이드바 외부를 클릭하면 사이드바가 닫힙니다.",
  ),
  F = m("<div style=height:100%>");
const G = [
  { title: "홈", path: "#", icon: T },
  {
    title: "문서",
    icon: z,
    children: [
      { title: "시작하기", path: "#" },
      { title: "API 참조", path: "#" },
    ],
  },
  { title: "설정", path: "#", icon: A },
];
function X() {
  const [y, g] = M(!1);
  return (() => {
    var l = F();
    return (
      k(
        l,
        a(V, {
          get toggled() {
            return y();
          },
          onToggledChange: g,
          get children() {
            return [
              a(B, {
                get children() {
                  return [
                    (() => {
                      var t = D();
                      return (d(() => s(t, n({ p: "base", fontWeight: "bold" }))), t);
                    })(),
                    a(W, {
                      name: "홍길동",
                      description: "user@example.com",
                      menus: [
                        { title: "프로필", onClick: () => alert("프로필") },
                        { title: "로그아웃", onClick: () => alert("로그아웃") },
                      ],
                    }),
                    a(O, { menus: G }),
                  ];
                },
              }),
              (() => {
                var t = E(),
                  r = t.firstChild,
                  c = r.firstChild,
                  b = r.nextSibling,
                  u = b.firstChild,
                  v = u.nextSibling;
                return (
                  k(
                    r,
                    a(_, {
                      onClick: () => g((e) => !e),
                      inset: !0,
                      get children() {
                        return a(P, { size: 20 });
                      },
                    }),
                    c,
                  ),
                  d(
                    (e) => {
                      var h = w.spacing.base,
                        f = `1px solid rgb(${o.border.base})`,
                        p = `rgb(${o.surface.base})`,
                        S = n({ ml: "base", fontWeight: "bold" }),
                        C = n({ p: "lg" }),
                        $ = `rgb(${o.text.muted})`,
                        x = n({ mt: "base" }),
                        I = `rgb(${o.text.muted})`;
                      return (
                        h !== e.e && i(r, "padding", (e.e = h)),
                        f !== e.t && i(r, "border-bottom", (e.t = f)),
                        p !== e.a && i(r, "background", (e.a = p)),
                        S !== e.o && s(c, (e.o = S)),
                        C !== e.i && s(b, (e.i = C)),
                        $ !== e.n && i(u, "color", (e.n = $)),
                        x !== e.s && s(v, (e.s = x)),
                        I !== e.h && i(v, "color", (e.h = I)),
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
                    },
                  ),
                  t
                );
              })(),
            ];
          },
        }),
      ),
      d((t) => i(l, "background", `rgb(${o.surface.base})`)),
      l
    );
  })();
}
export { X as default };
