import { SdSheetColumnDirective } from "../directives/SdSheetColumnDirective";

export interface ISdSheetColumnDef<T> {
  control: SdSheetColumnDirective<T>;
  fixed: boolean;
  width: string | undefined;
  headerStyle: string | undefined;
}
