import { type Component, createSignal } from "solid-js";
import type { ModalContentProps } from "../../disclosure/ModalContext";
import type { SheetConfig, SheetConfigColumn, SheetConfigColumnInfo, SheetReorderEvent } from "./types";
import { Sheet } from "./Sheet";
import { CheckBox } from "../../form-control/checkbox/CheckBox";
import { TextField } from "../../form-control/field/TextField";
import { Button } from "../../form-control/Button";

interface EditColumnItem {
  key: string;
  headerText: string;
  fixed: boolean;
  hidden: boolean;
  width: string;
}

export interface SheetConfigModalProps extends ModalContentProps<SheetConfig> {
  columnInfos: SheetConfigColumnInfo[];
  currentConfig: SheetConfig;
}

export const SheetConfigModal: Component<SheetConfigModalProps> = (props) => {
  /* eslint-disable solid/reactivity -- 모달 props는 마운트 시 한 번만 사용되는 정적 값 */
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

  const [editItems, setEditItems] = createSignal<EditColumnItem[]>(initialItems);

  function handleReorder(event: SheetReorderEvent<EditColumnItem>): void {
    const items = [...editItems()];
    const fromIndex = items.findIndex((i) => i.key === event.item.key);
    if (fromIndex < 0) return;

    const [moved] = items.splice(fromIndex, 1);
    let toIndex = items.findIndex((i) => i.key === event.targetItem.key);
    if (toIndex < 0) return;

    if (event.position === "after") toIndex++;
    items.splice(toIndex, 0, moved);
    setEditItems(items);
  }

  function updateItem(key: string, field: keyof EditColumnItem, value: unknown): void {
    setEditItems((prev) =>
      prev.map((item) =>
        item.key === key ? { ...item, [field]: value } : item,
      ),
    );
  }

  function handleOk(): void {
    const columnRecord: Record<string, SheetConfigColumn> = {};
    const items = editItems();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const info = props.columnInfos.find((c) => c.key === item.key)!;

      const entry: SheetConfigColumn = {};

      if (item.fixed !== info.fixed) entry.fixed = item.fixed;
      if (item.hidden !== info.hidden) entry.hidden = item.hidden;
      if (item.width && item.width !== (info.width ?? "")) entry.width = item.width;
      entry.displayOrder = i;

      if (Object.keys(entry).length > 0) {
        columnRecord[item.key] = entry;
      }
    }

    props.close({ columnRecord });
  }

  function handleReset(): void {
    if (!confirm("모든 시트 설정을 초기화하시겠습니까?")) return;
    props.close({ columnRecord: {} });
  }

  return (
    <div class="flex flex-col gap-2 p-2">
      <Sheet
        items={editItems()}
        key="__sheet-config-modal__"
        hideConfigBar
        onItemsReorder={handleReorder}
      >
        <Sheet.Column<EditColumnItem> key="header" header="컬럼" class="px-2 py-1">
          {(ctx) => ctx.item.headerText}
        </Sheet.Column>
        <Sheet.Column<EditColumnItem> key="fixed" header="고정" width="60px">
          {(ctx) => (
            <div class="flex items-center justify-center">
              <CheckBox
                value={ctx.item.fixed}
                onValueChange={(v) => updateItem(ctx.item.key, "fixed", v)}
              />
            </div>
          )}
        </Sheet.Column>
        <Sheet.Column<EditColumnItem> key="hidden" header="숨김" width="60px">
          {(ctx) => (
            <div class="flex items-center justify-center">
              <CheckBox
                value={ctx.item.hidden}
                onValueChange={(v) => updateItem(ctx.item.key, "hidden", v)}
              />
            </div>
          )}
        </Sheet.Column>
        <Sheet.Column<EditColumnItem> key="width" header="너비" width="100px">
          {(ctx) => (
            <TextField
              value={ctx.item.width}
              onValueChange={(v) => updateItem(ctx.item.key, "width", v)}
              inset
              placeholder="auto"
            />
          )}
        </Sheet.Column>
      </Sheet>

      <div class="flex justify-end gap-2">
        <Button onClick={handleReset} theme="warning">초기화</Button>
        <Button onClick={() => props.close(undefined)}>취소</Button>
        <Button onClick={handleOk} theme="primary">확인</Button>
      </div>
    </div>
  );
};
