import type { JSX, ParentProps } from "solid-js";

// --- Print.Page ---

function PrintPage(props: ParentProps) {
  return <div data-print-page>{props.children}</div>;
}

// --- Print ---

interface PrintProps extends ParentProps {
  ready?: boolean;
}

interface PrintComponent {
  (props: PrintProps): JSX.Element;
  Page: typeof PrintPage;
}

const PrintInner = (props: PrintProps) => {
  return (
    <div
      data-print-root
      attr:data-print-ready={props.ready !== false ? "" : undefined}
    >
      {props.children}
    </div>
  );
};

export const Print = PrintInner as unknown as PrintComponent;
Print.Page = PrintPage;
