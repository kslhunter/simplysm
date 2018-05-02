export const helpers = {
  stringifyEnv(param: { [key: string]: string | undefined }): { [key: string]: string } {
    const result: { [key: string]: string } = {};
    for (const key of Object.keys(param)) {
      result[key] = param[key] == undefined ? "undefined" : JSON.stringify(param[key]);
    }
    return result;
  }
};