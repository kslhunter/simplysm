/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

export const appIcons = {
  check: import("@fortawesome/pro-duotone-svg-icons/faCheck").then(m => m.faCheck),
  refresh: import("@fortawesome/pro-duotone-svg-icons/faRefresh").then(m => m.faRefresh),
};
