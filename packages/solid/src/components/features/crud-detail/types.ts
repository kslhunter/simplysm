import type { JSX } from "solid-js";
import type { SetStoreFunction } from "solid-js/store";
import type { DateTime } from "@simplysm/core-common";

// ── Detail Info ──

export interface CrudDetailInfo {
  isNew: boolean;
  isDeleted: boolean;
  lastModifiedAt?: DateTime;
  lastModifiedBy?: string;
}

// ── Context ──

export interface CrudDetailContext<TData> {
  data: TData;
  setData: SetStoreFunction<TData>;
  info: () => CrudDetailInfo;
  busy: () => boolean;
  hasChanges: () => boolean;
  save: () => Promise<void>;
  refresh: () => Promise<void>;
}

// ── Props ──

export interface CrudDetailProps<TData extends object> {
  load: () => Promise<{ data: TData; info: CrudDetailInfo }>;
  children: (ctx: CrudDetailContext<TData>) => JSX.Element;

  submit?: (data: TData) => Promise<boolean | undefined>;
  toggleDelete?: (del: boolean) => Promise<boolean | undefined>;
  editable?: boolean;
  deletable?: boolean;

  data?: TData;
  onDataChange?: (data: TData) => void;

  class?: string;
}

// ── Sub-component Defs ──

export interface CrudDetailToolsDef {
  __type: "crud-detail-tools";
  children: JSX.Element;
}

export interface CrudDetailBeforeDef {
  __type: "crud-detail-before";
  children: JSX.Element;
}

export interface CrudDetailAfterDef {
  __type: "crud-detail-after";
  children: JSX.Element;
}
