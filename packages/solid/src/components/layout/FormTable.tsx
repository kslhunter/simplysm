import { type JSX, type ParentComponent, Show, splitProps } from "solid-js";
import { twMerge } from "tailwind-merge";

export interface FormTableProps extends JSX.HTMLAttributes<HTMLTableElement> {}

export interface FormTableItemProps extends JSX.TdHTMLAttributes<HTMLTableCellElement> {
  label?: JSX.Element;
}

// -- Sub-components --

const FormTableRow: ParentComponent<JSX.HTMLAttributes<HTMLTableRowElement>> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class"]);
  return <tr class={twMerge("[&>td:last-child]:pr-0 [&:last-child>*]:pb-0", local.class)} {...rest}>{local.children}</tr>;
};

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
        <th class="w-0 whitespace-nowrap pb-1 pr-2 text-right align-middle">{local.label}</th>
      </Show>
      <td class={twMerge("pb-1 pr-2 align-middle", local.class)} colspan={effectiveColspan()} {...rest}>
        {local.children}
      </td>
    </>
  );
};

// -- Main component --

const FormTableBase: ParentComponent<FormTableProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class"]);

  return (
    <table data-form-table class={twMerge("border-separate border-spacing-0 border-0", local.class)} {...rest}>
      <tbody>{local.children}</tbody>
    </table>
  );
};

export const FormTable = Object.assign(FormTableBase, { Row: FormTableRow, Item: FormTableItem });
