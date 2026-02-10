import { createContext, useContext } from "solid-js";
const DropdownContext = createContext();
function useDropdown() {
  const ctx = useContext(DropdownContext);
  if (!ctx) return void 0;
  return {
    id: ctx.id,
    parentId: ctx.parentId,
    open: ctx.open,
    close: ctx.close,
  };
}
function useDropdownInternal() {
  return useContext(DropdownContext);
}
export { DropdownContext, useDropdown, useDropdownInternal };
//# sourceMappingURL=dropdown-context.js.map
