import { createContext, type JSX, type ParentComponent, splitProps, useContext } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { bg, border } from "../../styles/base.styles";
import { pad } from "../../styles/control.styles";

export interface TableProps extends JSX.HTMLAttributes<HTMLTableElement> {
  inset?: boolean;
}

const TableContext = createContext<{ inset: boolean }>({ inset: false });

// -- Sub-components --

const TableTr: ParentComponent<JSX.HTMLAttributes<HTMLTableRowElement>> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class"]);
  return <tr class={twMerge(local.class)} {...rest}>{local.children}</tr>;
};

const TableTh: ParentComponent<JSX.ThHTMLAttributes<HTMLTableCellElement>> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class"]);
  const ctx = useContext(TableContext);
  return (
    <th
      class={twMerge(
        clsx("border-l border-t", border.default, pad.default, bg.muted, "text-left font-bold"),
        ctx.inset && "first:border-l-0",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </th>
  );
};

const TableTd: ParentComponent<JSX.TdHTMLAttributes<HTMLTableCellElement>> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class"]);
  const ctx = useContext(TableContext);
  return (
    <td
      class={twMerge(
        clsx("border-l border-t", border.default, pad.default),
        ctx.inset && "first:border-l-0",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </td>
  );
};

// -- Main component --

const TableBase: ParentComponent<TableProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "inset"]);

  return (
    <TableContext.Provider value={{ get inset() { return !!local.inset; } }}>
      <table
        data-table
        class={twMerge(
          clsx("w-auto border-separate border-spacing-0 border-b border-r", border.default, "overflow-hidden rounded"),
          local.inset && clsx("border-b-0 border-r-0", "[&>*:first-child>tr:first-child>*]:border-t-0", "overflow-auto rounded-none"),
          local.class,
        )}
        {...rest}
      >
        {local.children}
      </table>
    </TableContext.Provider>
  );
};

export const Table = Object.assign(TableBase, { Tr: TableTr, Th: TableTh, Td: TableTd });
