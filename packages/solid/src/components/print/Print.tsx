import type { JSX, ParentProps } from "solid-js";

// --- Print.Page ---

function PrintPage(props: ParentProps) {
  return <div data-print-page>{props.children}</div>;
}

// --- Print ---

interface PrintComponent {
  (props: ParentProps): JSX.Element;
  Page: typeof PrintPage;
}

const PrintInner = (props: ParentProps) => {
  return <>{props.children}</>;
};

export const Print = PrintInner as unknown as PrintComponent;
Print.Page = PrintPage;
