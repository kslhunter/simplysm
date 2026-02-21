import { type Component, useContext } from "solid-js";
import { TopbarContext } from "./TopbarContext";

export const TopbarActions: Component = () => {
  const context = useContext(TopbarContext);

  return <span data-topbar-actions>{context?.actions()}</span>;
};
