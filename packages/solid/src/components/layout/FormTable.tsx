import { type JSX, type ParentComponent, Show, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export interface FormTableProps extends JSX.HTMLAttributes<HTMLTableElement> {}

export interface FormTableItemProps extends JSX.TdHTMLAttributes<HTMLTableCellElement> {
  label?: JSX.Element;
}

const baseClass = clsx("border-separate border-spacing-0 border-0");

// -- Sub-components --

const rowClass = clsx(
  "[&>*:last-child]:pr-0",
  "last:[&>*]:pb-0",
);

const FormTableRow: ParentComponent<JSX.HTMLAttributes<HTMLTableRowElement>> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class"]);
  return <tr class={twMerge(rowClass, local.class)} {...rest}>{local.children}</tr>;
};

const thClass = clsx(
  "align-middle pr-1.5 pb-1",
  "w-0 whitespace-nowrap pl-1 text-right",
);

const tdClass = clsx("align-middle pr-1.5 pb-1");

const FormTableItem: ParentComponent<FormTableItemProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "label", "colspan"]);

  const effectiveColspan = () => {
    const base = local.colspan != null ? Number(local.colspan) : undefined;
    if (local.label != null) return base;
    return (base ?? 1) + 1;
  };

  return (
    <>
      <Show when={local.label}>
        <th class={thClass}>{local.label}</th>
      </Show>
      <td class={twMerge(tdClass, local.class)} colspan={effectiveColspan()} {...rest}>
        {local.children}
      </td>
    </>
  );
};

// -- Main component --

const FormTableBase: ParentComponent<FormTableProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class"]);

  return (
    <table data-form-table class={twMerge(baseClass, local.class)} {...rest}>
      <tbody>{local.children}</tbody>
    </table>
  );
};

export const FormTable = Object.assign(FormTableBase, { Row: FormTableRow, Item: FormTableItem });
