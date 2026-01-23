import { render } from "solid-js/web";
import { ThemeProvider } from "@simplysm/solid";
import { App } from "./App";
import "../../solid/styles.css";

render(
  () => (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  ),
  document.getElementById("app")!,
);
