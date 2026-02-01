import { lazy } from "solid-js";
import { render } from "solid-js/web";
import { HashRouter, Route } from "@solidjs/router";
import { ConfigProvider, ThemeProvider } from "@simplysm/solid";
import App from "./App";

const Home = lazy(() => import("./pages/Home"));
const MainPage = lazy(() => import("./pages/home/MainPage"));
const ButtonPage = lazy(() => import("./pages/home/ButtonPage"));
const CheckboxPage = lazy(() => import("./pages/home/CheckboxPage"));
const ListPage = lazy(() => import("./pages/home/ListPage"));
const DropdownPage = lazy(() => import("./pages/home/DropdownPage"));
const RadioPage = lazy(() => import("./pages/home/RadioPage"));
const SidebarPage = lazy(() => import("./pages/home/SidebarPage"));
const MobileLayoutDemoPage = lazy(() => import("./pages/MobileLayoutDemoPage"));
const TopbarPage = lazy(() => import("./pages/home/TopbarPage"));
const FieldPage = lazy(() => import("./pages/home/FieldPage"));

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("[solid-demo] #root 요소를 찾을 수 없습니다. index.html에 <div id=\"root\"></div>가 있는지 확인하세요.");
}

render(
  () => (
    <ConfigProvider staticClientName="solid-demo">
      <ThemeProvider>
        <HashRouter root={App}>
          <Route path="/" component={Home}>
            <Route path="/" component={MainPage} />
            <Route path="/button" component={ButtonPage} />
            <Route path="/checkbox" component={CheckboxPage} />
            <Route path="/list" component={ListPage} />
            <Route path="/dropdown" component={DropdownPage} />
            <Route path="/radio" component={RadioPage} />
            <Route path="/sidebar" component={SidebarPage} />
            <Route path="/topbar" component={TopbarPage} />
            <Route path="/field" component={FieldPage} />
          </Route>
          <Route path="/mobile-layout-demo" component={MobileLayoutDemoPage} />
        </HashRouter>
      </ThemeProvider>
    </ConfigProvider>
  ),
  rootElement,
);
