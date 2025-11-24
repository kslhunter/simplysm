import { SdSheetColumnDirective } from "../directives/sd-sheet-column.directive";

export interface ISdSheetColumnDef<T> {
  control: SdSheetColumnDirective<T>;
  fixed: boolean;
  width: string | undefined;
  headerStyle: string | undefined;
}
