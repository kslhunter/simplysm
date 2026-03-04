import type { JSX } from "solid-js";

export function createDefComponent<TDef extends { __type: string }>(
  transformer: (props: any) => TDef,
): (props: any) => JSX.Element {
  return (props) => transformer(props) as unknown as JSX.Element;
}
