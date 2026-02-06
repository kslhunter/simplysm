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
        {/* 모바일 레이아웃 데모 (Home 레이아웃 외부) */}
        <Route path="/mobile-layout-demo" component={lazy(() => import("./pages/mobile/MobileLayoutDemoPage"))} />
        {/* 향후 확장: <Route path="/login" component={LoginPage} /> */}
        <Route path="/" component={Home}>
          <Route path="/" component={() => <Navigate href="/home" />} />
          <Route path="/home" component={MainPage} />
          <Route path="/home/main" component={MainPage} />
          <Route path="/home/form-control/button" component={lazy(() => import("./pages/form-control/ButtonPage"))} />
          <Route path="/home/form-control/select" component={lazy(() => import("./pages/form-control/SelectPage"))} />
          <Route path="/home/form-control/field" component={lazy(() => import("./pages/form-control/FieldPage"))} />
          <Route path="/home/form-control/theme-toggle" component={lazy(() => import("./pages/form-control/ThemeTogglePage"))} />
          <Route path="/home/form-control/checkbox-radio" component={lazy(() => import("./pages/form-control/CheckBoxRadioPage"))} />
          <Route path="/home/layout/sidebar" component={lazy(() => import("./pages/layout/SidebarPage"))} />
          <Route path="/home/layout/topbar" component={lazy(() => import("./pages/layout/TopbarPage"))} />
          <Route path="/home/layout/form-group" component={lazy(() => import("./pages/layout/FormGroupPage"))} />
          <Route path="/home/layout/form-table" component={lazy(() => import("./pages/layout/FormTablePage"))} />
          <Route path="/home/data/list" component={lazy(() => import("./pages/data/ListPage"))} />
          <Route path="/home/data/table" component={lazy(() => import("./pages/data/TablePage"))} />
          <Route path="/home/disclosure/collapse" component={lazy(() => import("./pages/disclosure/CollapsePage"))} />
          <Route path="/home/disclosure/dropdown" component={lazy(() => import("./pages/disclosure/DropdownPage"))} />
          <Route path="/home/display/card" component={lazy(() => import("./pages/display/CardPage"))} />
          <Route path="/home/display/icon" component={lazy(() => import("./pages/display/IconPage"))} />
          <Route path="/home/display/label" component={lazy(() => import("./pages/display/LabelPage"))} />
          <Route path="/home/display/note" component={lazy(() => import("./pages/display/NotePage"))} />
          <Route path="/home/feedback/notification" component={lazy(() => import("./pages/feedback/NotificationPage"))} />
          <Route path="/home/service/client" component={lazy(() => import("./pages/service/ServiceClientPage"))} />
          <Route path="/*" component={NotFoundPage} />
        </Route>
      </Route>
    </HashRouter>
  ),
  document.getElementById("root")!,
);
