import {Injectable} from "@angular/core";
import {Safe, Uuid} from "@simplism/sd-core";
import {SdKeyboardPanelProvider} from "../../packages/sd-angular/src/providers/SdKeyboardPanelProvider";

@Injectable()
export class SdHidBarcodeScannerProvider {
  private readonly _platform: string = Safe.obj(window["cordova"]).platformId;

  private readonly _keys: Uuid[] = [];
  private readonly _keyboardMap = {
    9: "\t",
    32: " ",
    48: "0",
    49: "1",
    50: "2",
    51: "3",
    52: "4",
    53: "5",
    54: "6",
    55: "7",
    56: "8",
    57: "9",
    65: "a",
    66: "b",
    67: "c",
    68: "d",
    69: "e",
    70: "f",
    71: "g",
    72: "h",
    73: "i",
    74: "j",
    75: "k",
    76: "l",
    77: "m",
    78: "n",
    79: "o",
    80: "p",
    81: "q",
    82: "r",
    83: "s",
    84: "t",
    85: "u",
    86: "v",
    87: "w",
    88: "x",
    89: "y",
    90: "z",
    96: "0",
    97: "1",
    98: "2",
    99: "3",
    100: "4",
    101: "5",
    102: "6",
    103: "7",
    104: "8",
    105: "9",
    110: ".",
    111: "/",
    106: "*",
    107: "+",
    109: "-",
    186: "[",
    187: "=",
    188: ",",
    189: "-",
    190: ".",
    191: "/",
    192: "`",
    219: "[",
    220: "\\",
    221: "]",
    222: "'"
  };

  private readonly _shifyKeyboardMap = {
    ...this._keyboardMap,
    48: ")",
    49: "!",
    50: "@",
    51: "#",
    52: "$",
    53: "%",
    54: "^",
    55: "&",
    56: "*",
    57: "(",
    65: "A",
    66: "B",
    67: "C",
    68: "D",
    69: "E",
    70: "F",
    71: "G",
    72: "H",
    73: "I",
    74: "J",
    75: "K",
    76: "L",
    77: "M",
    78: "N",
    79: "O",
    80: "P",
    81: "Q",
    82: "R",
    83: "S",
    84: "T",
    85: "U",
    86: "V",
    87: "W",
    88: "X",
    89: "Y",
    90: "Z",
    186: "{",
    187: "+",
    188: "<",
    189: "_",
    190: ">",
    191: "?",
    192: "~",
    219: "{",
    220: "|",
    221: "}",
    222: '"'
  };

  public constructor(private readonly _keyboardPanel: SdKeyboardPanelProvider) {

  }

  public start(callback: (value: string) => any): Uuid {
    const key = Uuid.newUuid();

    let timeout: number;
    let result = "";
    $(document).on(`keydown.${key.toString()}`, async event => {
      if (this._platform === "android" && this._keyboardPanel.isVisible) {
        return;
      }

      if (this._platform === "android" && !this._keyboardPanel.isVisible) {
        event.preventDefault();
      }

      const keyboardMap = event.shiftKey ? this._shifyKeyboardMap : this._keyboardMap;
      if (keyboardMap[event.which] !== undefined) {
        result += keyboardMap[event.which];
      }
      else if (event.which === 13 && result) {
        callback(result);
        event.preventDefault();
      }

      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        result = "";
      }, 200);
    });

    this._keys.push(key);
    return key;
  }

  public stop(key: Uuid): void {
    $(document).off(`keydown.${key}`);
    this._keys.remove(key);
  }

  public stopAll(): void {
    for (const key of this._keys) {
      this.stop(key);
    }
  }
}
