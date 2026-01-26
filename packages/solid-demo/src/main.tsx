import { lazy } from "solid-js";
import { render } from "solid-js/web";
import { Router, Route } from "@solidjs/router";
import { SdProvider, ThemeProvider } from "@simplysm/solid";
import { App } from "./App";
import "../../solid/styles.css";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const AnchorPage = lazy(() => import("./pages/AnchorPage"));
const ButtonPage = lazy(() => import("./pages/ButtonPage"));
const CheckboxPage = lazy(() => import("./pages/CheckboxPage"));
const FieldsPage = lazy(() => import("./pages/FieldsPage"));
const ListPage = lazy(() => import("./pages/ListPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

render(
  () => (
    <SdProvider clientName="solid-demo">
      <ThemeProvider>
        <Router root={App} base={"/solid-demo"}>
          <Route path="/" component={DashboardPage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/components/anchor" component={AnchorPage} />
          <Route path="/components/button" component={ButtonPage} />
          <Route path="/components/checkbox" component={CheckboxPage} />
          <Route path="/components/fields" component={FieldsPage} />
          <Route path="/components/list" component={ListPage} />
          <Route path="/settings" component={SettingsPage} />
        </Router>
      </ThemeProvider>
    </SdProvider>
  ),
  document.getElementById("app")!,
);
