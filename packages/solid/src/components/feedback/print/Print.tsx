import type { ParentProps } from "solid-js";

// --- Print.Page ---

function PrintPage(props: ParentProps) {
  return <div data-print-page>{props.children}</div>;
}

// --- Print ---

const PrintInner = (props: ParentProps) => {
  return <>{props.children}</>;
};

export const Print = Object.assign(PrintInner, {
  Page: PrintPage,
});
