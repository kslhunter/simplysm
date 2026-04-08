import { DestroyRef, inject, signal, type Signal } from "@angular/core";
import type { SdSheetColumnDef, SdSheetConfig } from "./types";
import type { injectSheetDomAccessor } from "./injectSheetDomAccessor";

export function injectSheetColumnResizing(options: {
  domAccessor: ReturnType<typeof injectSheetDomAccessor>;
  configResource: {
    value: Signal<SdSheetConfig | undefined>;
    set: (v: SdSheetConfig) => void;
  };
}) {
  const destroyRef = inject(DestroyRef);

  const isResizing = signal(false);
  const indicatorLeft = signal(0);
  const lastResizeEndTimeStamp = signal(0);
  let resizingCleanup: (() => void) | null = null;

  destroyRef.onDestroy(() => {
    resizingCleanup?.();
  });

  function saveColumnConfig(
    colKey: string,
    changes: Partial<SdSheetConfig["columnRecord"][string]>,
  ): void {
    const current = options.configResource.value() ?? { columnRecord: {} };
    const columnRecord = { ...current.columnRecord };
    columnRecord[colKey] = { ...columnRecord[colKey], ...changes };
    options.configResource.set({ ...current, columnRecord });
  }

  function onMousedown(event: MouseEvent, colDef: SdSheetColumnDef): void {
    event.preventDefault();
    event.stopPropagation();

    const container = options.domAccessor.getContainer();
    const startX = event.clientX;
    const th = (event.target as HTMLElement).parentElement as HTMLElement;
    const startWidth = th.offsetWidth;

    isResizing.set(true);
    indicatorLeft.set(th.offsetLeft + th.offsetWidth - container.scrollLeft);

    const onMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(startWidth + deltaX, 5);
      indicatorLeft.set(th.offsetLeft + newWidth - container.scrollLeft);
    };

    const onMouseUp = (e: MouseEvent) => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      resizingCleanup = null;

      const deltaX = e.clientX - startX;
      const newWidth = Math.max(startWidth + deltaX, 5);

      isResizing.set(false);
      saveColumnConfig(colDef.key, { width: `${newWidth}px` });

      lastResizeEndTimeStamp.set(e.timeStamp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    resizingCleanup = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }

  function onDblClick(event: MouseEvent, colDef: SdSheetColumnDef): void {
    event.preventDefault();
    event.stopPropagation();

    const current = options.configResource.value() ?? { columnRecord: {} };
    const columnRecord = { ...current.columnRecord };
    const colConfig = { ...columnRecord[colDef.key] };
    delete colConfig.width;
    columnRecord[colDef.key] = colConfig;
    options.configResource.set({ ...current, columnRecord });
  }

  return {
    isResizing,
    indicatorLeft,
    lastResizeEndTimeStamp,
    onMousedown,
    onDblClick,
  };
}
