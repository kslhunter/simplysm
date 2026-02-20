import { render } from "solid-js/web";
import { HashRouter, Navigate, Route } from "@solidjs/router";
import { For, lazy } from "solid-js";
import { App } from "./App";
import { Home } from "./pages/Home";
import { NotFoundPage } from "./pages/NotFoundPage";
import { appStructure } from "./appStructure";
import "./main.css";

render(
  () => (
    <HashRouter>
      <Route path="/" component={App}>
        {/* Home 레이아웃 외부 라우트 */}
        <Route path="/login" component={lazy(() => import("./pages/LoginPage"))} />
        <Route
          path="/mobile-layout-demo"
          component={lazy(() => import("./pages/mobile/MobileLayoutDemoPage"))}
        />
        {/* Home 레이아웃 내부 */}
        <Route path="/home" component={Home}>
          <Route path="/" component={() => <Navigate href="/home/main" />} />
          <For each={appStructure.usableRoutes()}>
            {(r) => <Route path={r.path} component={r.component} />}
          </For>
          <Route path="/*" component={NotFoundPage} />
        </Route>
        {/* 루트 리다이렉트 */}
        <Route path="/" component={() => <Navigate href="/login" />} />
      </Route>
    </HashRouter>
  ),
  document.getElementById("root")!,
);
