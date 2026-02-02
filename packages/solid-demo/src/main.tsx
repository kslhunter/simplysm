import { render } from "solid-js/web";
import { Router, Route } from "@solidjs/router";
import { ConfigContext } from "@simplysm/solid";
import "./main.css";
import { App } from "./App";
import { SidebarDemo } from "./SidebarDemo";

render(
  () => (
    <ConfigContext.Provider value={{ clientName: "solid-demo" }}>
      <Router>
        <Route path="/" component={App} />
        <Route path="/sidebar/*" component={SidebarDemo} />
      </Router>
    </ConfigContext.Provider>
  ),
  document.getElementById("root")!,
);
