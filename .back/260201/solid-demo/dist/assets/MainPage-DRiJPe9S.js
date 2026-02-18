import {
  u as V,
  c as z,
  a as n,
  b as d,
  s as t,
  d as l,
  t as L,
  e as B,
} from "./index-DaQvuWeP.js";
import { T as D, a as J } from "./topbar-DloMbu3D.js";
import { t as r } from "./token.css-Cwc-7hPJ.js";
import { a as v } from "./atoms.css-WCFmS3R-.js";
import "./IconMenu2-BvvTiCnB.js";
var N = L("<h1>Home"),
  R = L(
    "<div style=overflow:auto;flex:1><div><select style=width:100%><option value=light>Light</option><option value=dark>Dark</option></select></div><h1>Simplysm Solid 컴포넌트 라이브러리</h1><p>SolidJS 기반의 UI 컴포넌트 데모 페이지입니다.</p><h2>사용 가능한 컴포넌트</h2><ul style=list-style-type:disc;line-height:2><li><strong>Button</strong> - 다양한 테마, 크기, 스타일을 지원하는 버튼 컴포넌트</li><li><strong>List / ListItem</strong> - 계층 구조를 지원하는 리스트 컴포넌트</li><li><strong>Sidebar</strong> - 반응형 사이드바 레이아웃 컴포넌트</li><li><strong>Collapse</strong> - 접기/펼치기 애니메이션 컴포넌트</li></ul><h2>시작하기</h2><p>왼쪽 사이드바 메뉴에서 각 컴포넌트의 데모를 확인할 수 있습니다.",
  );
function G() {
  const { theme: w, setTheme: E } = V();
  return z(J, {
    get children() {
      return [
        z(D, {
          get children() {
            var o = N();
            return (n(() => d(o, v({ m: "none", fontSize: "base" }))), o);
          },
        }),
        (() => {
          var o = R(),
            s = o.firstChild,
            i = s.firstChild,
            H = s.nextSibling,
            a = H.nextSibling,
            I = a.nextSibling,
            g = I.nextSibling,
            m = g.nextSibling,
            P = m.nextSibling;
          return (
            (i.$$input = (e) => E(e.currentTarget.value)),
            n(
              (e) => {
                var u = v({ p: "xxl" }),
                  b = v({ px: "base", py: "base", mt: "auto" }),
                  c = r.spacing.base,
                  h = r.radius.base,
                  x = `1px solid rgb(${l.border.base})`,
                  f = `rgb(${l.surface.base})`,
                  S = `rgb(${l.text.base})`,
                  p = r.font.size.lg,
                  y = `rgb(${l.text.muted})`,
                  T = r.spacing.xl,
                  $ = r.spacing.xl,
                  C = r.spacing.xl,
                  k = `rgb(${l.text.muted})`;
                return (
                  u !== e.e && d(o, (e.e = u)),
                  b !== e.t && d(s, (e.t = b)),
                  c !== e.a && t(i, "padding", (e.a = c)),
                  h !== e.o && t(i, "border-radius", (e.o = h)),
                  x !== e.i && t(i, "border", (e.i = x)),
                  f !== e.n && t(i, "background", (e.n = f)),
                  S !== e.s && t(i, "color", (e.s = S)),
                  p !== e.h && t(a, "font-size", (e.h = p)),
                  y !== e.r && t(a, "color", (e.r = y)),
                  T !== e.d && t(a, "margin-bottom", (e.d = T)),
                  $ !== e.l && t(g, "padding-left", (e.l = $)),
                  C !== e.u && t(m, "margin-top", (e.u = C)),
                  k !== e.c && t(P, "color", (e.c = k)),
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
              },
            ),
            n(() => (i.value = w())),
            o
          );
        })(),
      ];
    },
  });
}
B(["input"]);
export { G as default };
