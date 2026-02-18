import { createContext, createEffect, useContext } from "solid-js";
import { isServer } from "solid-js/web";
import { darkTheme, lightTheme } from "../styles/variables/theme.css";
import { useLocalStorage } from "../hooks/useLocalStorage";
const themeClassMap = { light: lightTheme, dark: darkTheme };
const ThemeContext = createContext();
const ThemeProvider = (props) => {
  const [theme, setTheme] = useLocalStorage("theme", "light");
  createEffect(() => {
    if (isServer) return;
    const el = document.documentElement;
    el.classList.remove(lightTheme, darkTheme);
    el.classList.add(themeClassMap[theme()]);
  });
  return /* @__PURE__ */ React.createElement(
    ThemeContext.Provider,
    { value: { theme, setTheme } },
    props.children,
  );
};
function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error(
      "[useTheme] ThemeProvider \uB0B4\uBD80\uC5D0\uC11C \uC0AC\uC6A9\uD574\uC57C \uD569\uB2C8\uB2E4.\nThemeProvider\uB294 ConfigProvider \uB0B4\uBD80\uC5D0 \uBC30\uCE58\uB418\uC5B4\uC57C \uD569\uB2C8\uB2E4.\n\uC608: <ConfigProvider><ThemeProvider>...</ThemeProvider></ConfigProvider>",
    );
  }
  return ctx;
}
export { ThemeProvider, useTheme };
//# sourceMappingURL=ThemeContext.js.map
