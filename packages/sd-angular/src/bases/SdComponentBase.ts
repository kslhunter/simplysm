export class SdComponentBase {
  public getTrackByFn(...args: string[]): (index: number, value: any) => any {
    return function (index: number, value: any): any {
      if (args.length > 0) {
        return args.every(arg => value[arg] == undefined)
          ? value == undefined
            ? index
            : value
          : args.map(arg => value[arg]);
      }
      else {
        return value == undefined ? index : value;
      }
    };
  }
}