import { createContext, useContext } from "solid-js";
const SidebarContext = createContext();
function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error(
      "[useSidebar] SidebarContainer \uB0B4\uBD80\uC5D0\uC11C \uC0AC\uC6A9\uD574\uC57C \uD569\uB2C8\uB2E4.\nSidebar, SidebarMenu, SidebarUser \uB4F1\uC758 \uCEF4\uD3EC\uB10C\uD2B8\uB294 \uBC18\uB4DC\uC2DC SidebarContainer\uB85C \uAC10\uC2F8\uC57C \uD569\uB2C8\uB2E4.",
    );
  }
  return ctx;
}
export { SidebarContext, useSidebar };
//# sourceMappingURL=sidebar-context.js.map
