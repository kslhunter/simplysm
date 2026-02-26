import {
  createContext,
  useContext,
  type ParentComponent,
  createSignal,
  createMemo,
} from "solid-js";
import type { I18nContextValue, I18nConfigureOptions, FlatDict } from "./I18nContext.types";
import { flattenDict, mergeDict, interpolate } from "./i18nUtils";
import enDict from "./locales/en";
import koDict from "./locales/ko";

/**
 * I18n Context
 */
const I18nContext = createContext<I18nContextValue>();

/**
 * Detect locale from navigator.language
 * "ko-KR" → "ko", "en-US" → "en", etc.
 */
function detectLocaleFromNavigator(): string {
  const lang = navigator.language.split("-")[0];
  return ["ko", "en"].includes(lang) ? lang : "en";
}

/**
 * Get i18n context value
 *
 * @throws Throws error if I18nProvider is not present
 */
export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n can only be used inside I18nProvider");
  }
  return context;
}

/**
 * Get i18n context value (optional, returns undefined if not in provider)
 */
export function useI18nOptional(): I18nContextValue | undefined {
  return useContext(I18nContext);
}

/**
 * I18n Provider component
 *
 * @remarks
 * - Provides i18n context with t(), locale, setLocale, configure
 * - Built-in dictionaries: en, ko (nested, flattened at runtime)
 * - localStorage persistence via @simplysm/solid useSyncConfig pattern
 * - Apps can override/extend dicts via configure()
 *
 * @example
 * ```tsx
 * <I18nProvider>
 *   <App />
 * </I18nProvider>
 *
 * // Later in app:
 * const { t, setLocale, configure } = useI18n();
 *
 * // Change locale
 * setLocale("ko");
 *
 * // Or override/add languages
 * configure({
 *   locale: "ja",
 *   dict: {
 *     ja: { "calendar.weeks.sun": "日" },
 *   },
 * });
 * ```
 */
export const I18nProvider: ParentComponent = (props) => {
  // Flatten built-in dictionaries
  const builtInDicts: Record<string, FlatDict> = {
    en: flattenDict(enDict),
    ko: flattenDict(koDict),
  };

  // State for active locale and loaded dictionaries
  const [locale, setLocale] = createSignal<string>(detectLocaleFromNavigator());
  const [dicts, setDicts] = createSignal<Record<string, FlatDict>>(builtInDicts);

  // Current dictionary (locale-specific)
  const currentDict = createMemo(() => {
    const current = locale();
    return dicts()[current] ?? dicts()["en"];
  });

  // Translate function
  const t = (key: string, params?: Record<string, string>): string => {
    const dict = currentDict();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const template = dict[key] ?? dicts()["en"][key] ?? key;
    return interpolate(template, params);
  };

  // Configure function (cumulative merge)
  const configure = (options: I18nConfigureOptions) => {
    if (options.locale !== undefined) {
      setLocale(options.locale);
    }

    if (options.dict !== undefined) {
      setDicts((prevDicts) => {
        const newDicts = { ...prevDicts };
        for (const [loc, nestedDict] of Object.entries(options.dict!)) {
          const flattened = flattenDict(nestedDict);
          newDicts[loc] = mergeDict(newDicts[loc] ?? {}, flattened);
        }
        return newDicts;
      });
    }
  };

  const contextValue: I18nContextValue = {
    t,
    locale,
    setLocale,
    configure,
  };

  return <I18nContext.Provider value={contextValue}>{props.children}</I18nContext.Provider>;
};
