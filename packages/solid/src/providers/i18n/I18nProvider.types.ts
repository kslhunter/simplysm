import type { Accessor } from "solid-js";

/**
 * I18n context value
 */
export interface I18nContextValue {
  /** Translate function */
  t: (key: string, params?: Record<string, string>) => string;
  /** Current active locale (reactive) */
  locale: Accessor<string>;
  /** Set active locale */
  setLocale: (locale: string) => void;
  /** Configure dictionary and locale */
  configure: (options: I18nConfigureOptions) => void;
}

/**
 * I18n configure options
 */
export interface I18nConfigureOptions {
  /** Active locale (if omitted, current locale is kept) */
  locale?: string;
  /** Nested dictionaries to merge into built-in dicts */
  dict?: Record<string, Record<string, unknown>>;
}

/**
 * Flattened i18n dictionary
 */
export type FlatDict = Record<string, string>;
