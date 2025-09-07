/* eslint-disable no-console */
import { SyntaxKind } from "ts-morph";
import getTsMortphSourceFiles from "./core/get-ts-morph-source-files";
import convertSymbols from "./core/convert-symbol";

export default function convertSelectModalButtonToSelectButton() {
  // 1. SdIconControl → FaIconComponent
  convertSymbols({
    "@simplysm/sd-angular#SdSharedDataSelectModalButtonControl":
      "@simplysm/sd-angular#SdSharedDataSelectButtonControl",
    "@simplysm/sd-angular#SdSelectModalButtonControl":
      "@simplysm/sd-angular#SdDataSelectButtonControl",
    "@simplysm/sd-angular#TSelectValue": "@simplysm/sd-angular#TSelectModeValue",
    "@simplysm/sd-angular#SdSharedDataSelectViewControl": "@simplysm/sd-angular#SdSharedDataSelectListControl",
  });

  const sourceFiles = getTsMortphSourceFiles();

  for (const sourceFile of sourceFiles) {
    const filePath = sourceFile.getFilePath();
    let didChange = false;

    // 3. 템플릿 내 sd-shared-data-select-modal-button → sd-shared-data-select-button
    const templates = sourceFile.getDescendantsOfKind(SyntaxKind.NoSubstitutionTemplateLiteral);

    for (const tmpl of templates) {
      const raw = tmpl.getLiteralText();
      if (raw.includes("<sd-shared-data-select-modal-button")) {
        const replaced = raw
          // <sd-icon ...>...</sd-icon> → <fa-icon ...>...</fa-icon>
          .replace(
            /<sd-shared-data-select-modal-button\b([^>]*)>([\s\S]*?)<\/sd-shared-data-select-modal-button>/g,
            (_, attrs, inner) => {
              return `<sd-shared-data-select-button ${attrs}>${inner}</sd-shared-data-select-button>`;
            },
          );

        if (replaced !== raw) {
          tmpl.setLiteralValue(replaced);
          console.log(
            `[template] ${sourceFile.getBaseName()} :: <sd-shared-data-select-modal-button> → <sd-shared-data-select-button> 변환됨`,
          );
          didChange = true;
        }
      }

      if (raw.includes("<sd-select-modal-button")) {
        const replaced = raw
          // <sd-icon ...>...</sd-icon> → <fa-icon ...>...</fa-icon>
          .replace(
            /<sd-select-modal-button\b([^>]*)>([\s\S]*?)<\/sd-select-modal-button>/g,
            (_, attrs, inner) => {
              return `<sd-data-select-button ${attrs}>${inner}</sd-data-select-button>`;
            },
          );

        if (replaced !== raw) {
          tmpl.setLiteralValue(replaced);
          console.log(
            `[template] ${sourceFile.getBaseName()} :: <sd-select-modal-button> → <sd-data-select-button> 변환됨`,
          );
          didChange = true;
        }
      }

      if (raw.includes("<sd-shared-data-select-view")) {
        const replaced = raw
          // <sd-icon ...>...</sd-icon> → <fa-icon ...>...</fa-icon>
          .replace(
            /<sd-shared-data-select-view\b([^>]*)>([\s\S]*?)<\/sd-shared-data-select-view>/g,
            (_, attrs, inner) => {
              return `<sd-shared-data-select-list ${attrs}>${inner}</sd-shared-data-select-list>`;
            },
          );

        if (replaced !== raw) {
          tmpl.setLiteralValue(replaced);
          console.log(
            `[template] ${sourceFile.getBaseName()} :: <sd-shared-data-select-view> → <sd-shared-data-select-list> 변환됨`,
          );
          didChange = true;
        }
      }
    }

    if (didChange) {
      sourceFile.saveSync();
      console.log(`[저장 완료] ${filePath}`);
    }
  }
}
