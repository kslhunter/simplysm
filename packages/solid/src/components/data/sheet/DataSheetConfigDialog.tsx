import { type Component } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import clsx from "clsx";
import { useDialogInstance } from "../../disclosure/DialogInstanceContext";
import type {
  DataSheetConfig,
  DataSheetConfigColumn,
  DataSheetConfigColumnInfo,
  DataSheetReorderEvent,
} from "./types";
import { DataSheet } from "./DataSheet";
import { Checkbox } from "../../form-control/checkbox/Checkbox";
import { TextInput } from "../../form-control/field/TextInput";
import { Button } from "../../form-control/Button";
import { borderSubtle } from "../../../styles/tokens.styles";

const containerClass = clsx("flex flex-col", "gap-2", "p-2");
const sheetWrapperClass = clsx("rounded border", borderSubtle);
const footerClass = clsx("flex justify-between", "gap-2");
const footerActionsClass = clsx("flex gap-2");

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
}

export const DataSheetConfigDialog: Component<DataSheetConfigDialogProps> = (props) => {
  const dialog = useDialogInstance<DataSheetConfig>();

  /* eslint-disable solid/reactivity -- modal props are static values only used once at mount time */
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
  /* eslint-enable solid/reactivity */

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
      const info = props.columnInfos.find((c) => c.key === item.key)!;

      const entry: DataSheetConfigColumn = {};

      if (item.fixed !== info.fixed) entry.fixed = item.fixed;
      if (item.hidden !== info.hidden) entry.hidden = item.hidden;
      if (item.width && item.width !== (info.width ?? "")) entry.width = item.width;
      entry.displayOrder = i;

      if (Object.keys(entry).length > 0) {
        columnRecord[item.key] = entry;
      }
    }

    dialog?.close({ columnRecord });
  }

  function handleReset(): void {
    if (!confirm("모든 시트 설정을 초기화하시겠습니까?")) return;
    dialog?.close({ columnRecord: {} });
  }

  return (
    <div class={containerClass}>
      <div class={sheetWrapperClass}>
        <DataSheet items={editItems} inset hideConfigBar onItemsReorder={handleReorder}>
          <DataSheet.Column<EditColumnItem>
            key="header"
            header="컬럼"
            class="px-2 py-1"
            sortable={false}
          >
            {(ctx) => ctx.item.headerText}
          </DataSheet.Column>
          <DataSheet.Column<EditColumnItem> key="fixed" header="고정" sortable={false}>
            {(ctx) => (
              <Checkbox
                inset
                value={ctx.item.fixed}
                onValueChange={(v) => updateItem(ctx.item.key, "fixed", v)}
              />
            )}
          </DataSheet.Column>
          <DataSheet.Column<EditColumnItem> key="hidden" header="숨김" sortable={false}>
            {(ctx) => (
              <Checkbox
                inset
                value={ctx.item.hidden}
                onValueChange={(v) => updateItem(ctx.item.key, "hidden", v)}
              />
            )}
          </DataSheet.Column>
          <DataSheet.Column<EditColumnItem> key="width" header="너비" sortable={false}>
            {(ctx) => (
              <TextInput
                value={ctx.item.width}
                onValueChange={(v) => updateItem(ctx.item.key, "width", v)}
                inset
                placeholder="auto"
              />
            )}
          </DataSheet.Column>
        </DataSheet>
      </div>

      <div class={footerClass}>
        <Button onClick={handleReset} theme="warning" variant="solid">
          초기화
        </Button>
        <div class={footerActionsClass}>
          <Button onClick={() => dialog?.close(undefined)}>취소</Button>
          <Button onClick={handleOk} theme="primary" variant="solid">
            확인
          </Button>
        </div>
      </div>
    </div>
  );
};
