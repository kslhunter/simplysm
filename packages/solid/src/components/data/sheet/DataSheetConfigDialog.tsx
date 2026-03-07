import { type Component } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import clsx from "clsx";
import type {
  DataSheetConfig,
  DataSheetConfigColumn,
  DataSheetConfigColumnInfo,
  DataSheetReorderEvent,
} from "./DataSheet.types";
import { DataSheet } from "./DataSheet";
import { Checkbox } from "../../form-control/checkbox/Checkbox";
import { TextInput } from "../../form-control/field/TextInput";
import { Button } from "../../form-control/Button";
import { border } from "../../../styles/base.styles";
import { pad } from "../../../styles/control.styles";
import { useI18n } from "../../../providers/i18n/I18nProvider";

interface EditColumnItem {
  key: string;
  headerText: string;
  fixed: boolean;
  hidden: boolean;
  width: string;
}

export interface DataSheetConfigDialogProps {
  columnInfos: DataSheetConfigColumnInfo[];
  currentConfig: DataSheetConfig;
  close?: (result?: DataSheetConfig) => void;
}

export const DataSheetConfigDialog: Component<DataSheetConfigDialogProps> = (props) => {
  const i18n = useI18n();

  const initialItems: EditColumnItem[] = props.columnInfos
    .filter((info) => !info.collapse)
    .map((info) => {
      const saved = props.currentConfig.columnRecord?.[info.key];
      return {
        key: info.key,
        headerText: info.header.join(" > "),
        fixed: saved?.fixed ?? info.fixed,
        hidden: saved?.hidden ?? info.hidden,
        width: saved?.width ?? info.width ?? "",
      };
    })
    .sort((a, b) => {
      const orderA = props.currentConfig.columnRecord?.[a.key]?.displayOrder ?? Infinity;
      const orderB = props.currentConfig.columnRecord?.[b.key]?.displayOrder ?? Infinity;
      return orderA - orderB;
    });

  const [editItems, setEditItems] = createStore<EditColumnItem[]>(initialItems);

  function handleReorder(event: DataSheetReorderEvent<EditColumnItem>): void {
    const items = [...editItems];
    const fromIndex = items.findIndex((i) => i.key === event.item.key);
    if (fromIndex < 0) return;

    const [moved] = items.splice(fromIndex, 1);
    let toIndex = items.findIndex((i) => i.key === event.targetItem.key);
    if (toIndex < 0) return;

    if (event.position === "after") toIndex++;
    items.splice(toIndex, 0, moved);
    setEditItems(reconcile(items));
  }

  function updateItem(
    key: string,
    field: keyof EditColumnItem,
    value: EditColumnItem[keyof EditColumnItem],
  ): void {
    const index = editItems.findIndex((item) => item.key === key);
    if (index >= 0) {
      setEditItems(index, { [field]: value } as Partial<EditColumnItem>);
    }
  }

  function handleOk(): void {
    const columnRecord: Record<string, DataSheetConfigColumn> = {};

    for (let i = 0; i < editItems.length; i++) {
      const item = editItems[i];
      const info = props.columnInfos.find((c) => c.key === item.key);
      if (!info) continue;

      const entry: DataSheetConfigColumn = {};

      if (item.fixed !== info.fixed) entry.fixed = item.fixed;
      if (item.hidden !== info.hidden) entry.hidden = item.hidden;
      if (item.width && item.width !== (info.width ?? "")) entry.width = item.width;
      entry.displayOrder = i;

      if (Object.keys(entry).length > 0) {
        columnRecord[item.key] = entry;
      }
    }

    props.close?.({ columnRecord });
  }

  function handleReset(): void {
    if (!confirm(i18n.t("dataSheetConfigDialog.resetConfirm"))) return;
    props.close?.({ columnRecord: {} });
  }

  return (
    <div class="flex flex-col gap-2 p-2">
      <div class={clsx("rounded border", border.subtle)}>
        <DataSheet items={editItems} inset hideConfigBar onItemsReorder={handleReorder}>
          <DataSheet.Column<EditColumnItem>
            key="header"
            header={i18n.t("dataSheetConfigDialog.column")}
            class={pad.md}
            sortable={false}
          >
            {(ctx) => ctx.item.headerText}
          </DataSheet.Column>
          <DataSheet.Column<EditColumnItem> key="fixed" header={i18n.t("dataSheetConfigDialog.fixed")} sortable={false}>
            {(ctx) => (
              <Checkbox
                inset
                checked={ctx.item.fixed}
                onCheckedChange={(v) => updateItem(ctx.item.key, "fixed", v)}
              />
            )}
          </DataSheet.Column>
          <DataSheet.Column<EditColumnItem> key="hidden" header={i18n.t("dataSheetConfigDialog.hidden")} sortable={false}>
            {(ctx) => (
              <Checkbox
                inset
                checked={ctx.item.hidden}
                onCheckedChange={(v) => updateItem(ctx.item.key, "hidden", v)}
              />
            )}
          </DataSheet.Column>
          <DataSheet.Column<EditColumnItem> key="width" header={i18n.t("dataSheetConfigDialog.width")} sortable={false}>
            {(ctx) => (
              <TextInput
                value={ctx.item.width}
                onValueChange={(v) => updateItem(ctx.item.key, "width", v)}
                inset
                placeholder={i18n.t("dataSheetConfigDialog.autoPlaceholder")}
              />
            )}
          </DataSheet.Column>
        </DataSheet>
      </div>

      <div class="flex justify-between gap-2">
        <Button onClick={handleReset} theme="warning" variant="solid">
          {i18n.t("dataSheetConfigDialog.reset")}
        </Button>
        <div class="flex gap-2">
          <Button onClick={() => props.close?.(undefined)}>{i18n.t("dataSheetConfigDialog.cancel")}</Button>
          <Button onClick={handleOk} theme="primary" variant="solid">
            {i18n.t("dataSheetConfigDialog.confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
};
