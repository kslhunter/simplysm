import { render } from "solid-js/web";
import { HashRouter, Navigate, Route } from "@solidjs/router";
import { lazy } from "solid-js";
import { App } from "./App";
import { Home } from "./pages/Home";
import { MainPage } from "./pages/main/MainPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import "./main.css";

render(
  () => (
    <HashRouter>
      <Route path="/" component={App}>
        {/* 향후 확장: <Route path="/login" component={LoginPage} /> */}
        <Route path="/" component={Home}>
          <Route path="/" component={() => <Navigate href="/home" />} />
          <Route path="/home" component={MainPage} />
          <Route path="/home/main" component={MainPage} />
          <Route path="/home/controls/button" component={lazy(() => import("./pages/controls/./ButtonPage"))} />
          <Route path="/home/data/list" component={lazy(() => import("./pages/data/./ListPage"))} />
          <Route path="/home/disclosure/collapse" component={lazy(() => import("./pages/disclosure/./CollapsePage"))} />
          <Route path="/home/navigation/sidebar" component={lazy(() => import("./pages/navigation/./SidebarPage"))} />
          <Route path="/home/overlay/dropdown" component={lazy(() => import("./pages/overlay/./DropdownPage"))} />
          <Route path="/*" component={NotFoundPage} />
        </Route>
      </Route>
    </HashRouter>
  ),
  document.getElementById("root")!,
);
