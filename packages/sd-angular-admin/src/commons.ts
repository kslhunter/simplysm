/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

export const myIcons = {
  warning: import("@fortawesome/pro-duotone-svg-icons/faTriangleExclamation").then(m => m.definition),
  search: import("@fortawesome/pro-duotone-svg-icons/faSearch").then(m => m.definition),
  refresh: import("@fortawesome/pro-duotone-svg-icons/faRefresh").then(m => m.definition),
  save: import("@fortawesome/pro-duotone-svg-icons/faSave").then(m => m.definition),
  add: import("@fortawesome/pro-duotone-svg-icons/faAdd").then(m => m.definition),
  xmark: import("@fortawesome/pro-duotone-svg-icons/faXmark").then(m => m.definition)
};

export const TXT_CHANGE_IGNORE_CONFIRM = `
변경사항이 있습니다. 모든 변경사항을 무시하시겠습니까?
- 확인: 변경사항을 무시하고, 현재 요청한 작업을 수행
- 취소: 현재 요청한 작업을 취소하고, 변경사항 재검토`.trim();
