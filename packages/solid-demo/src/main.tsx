import { render } from "solid-js/web";
import { HashRouter, Navigate, Route } from "@solidjs/router";
import { For } from "solid-js";
import { App } from "./App";
import { HomeView } from "./views/home/HomeView";
import { NotFoundView } from "./views/not-found/NotFoundView";
import { LoginView } from "./views/auth/LoginView";
import { MobileLayoutDemoView } from "./views/mobile/MobileLayoutDemoView";
import { AppStructureProvider, useAppStructure } from "./providers/AppStructureProvider";
import "./main.css";

function HomeRoutes() {
  const appStructure = useAppStructure();
  return (
    <For each={appStructure.usableRoutes()}>
      {(r) => <Route path={r.path} component={r.component} />}
    </For>
  );
}

render(
  () => (
    <AppStructureProvider>
      <HashRouter>
        <Route path="/" component={App}>
          {/* Routes outside Home layout */}
          <Route path="/login" component={LoginView} />
          <Route path="/mobile-layout-demo" component={MobileLayoutDemoView} />
          {/* Inside Home layout */}
          <Route path="/home" component={HomeView}>
            <Route path="/" component={() => <Navigate href="/home/main" />} />
            <HomeRoutes />
            <Route path="/*" component={NotFoundView} />
          </Route>
          {/* Root redirect */}
          <Route path="/" component={() => <Navigate href="/login" />} />
        </Route>
      </HashRouter>
    </AppStructureProvider>
  ),
  document.getElementById("root")!,
);
