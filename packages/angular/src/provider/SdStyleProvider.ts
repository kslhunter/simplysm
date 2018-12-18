import {ElementRef, Injectable, Injector, OnDestroy} from "@angular/core";
import {Uuid} from "../../../core/src";
import * as less from "less";
import {sdColors} from "../common/sdColors";
import {stylesDefaults} from "../styles/stylesDefault";
import {stylesClasses} from "../styles/stylesClasses";

@Injectable()
export class SdStyleProvider {
  public themeColor = {
    grey: {
      lightest: sdColors.grey["200"],
      lighter: sdColors.grey["300"],
      light: sdColors.grey["400"],
      default: sdColors.grey["500"],
      dark: sdColors.grey["600"],
      darker: sdColors.grey["700"],
      darkest: sdColors.grey["800"]
    },
    bluegrey: {
      lightest: sdColors.bluegrey["200"],
      lighter: sdColors.bluegrey["300"],
      light: sdColors.bluegrey["400"],
      default: sdColors.bluegrey["500"],
      dark: sdColors.bluegrey["600"],
      darker: sdColors.bluegrey["800"],
      darkest: sdColors.bluegrey["900"]
    },
    primary: {
      lightest: sdColors.deepPurple["50"],
      lighter: sdColors.deepPurple["100"],
      light: sdColors.deepPurple["200"],
      default: sdColors.deepPurple["500"],
      dark: sdColors.deepPurple["600"],
      darker: sdColors.deepPurple["700"],
      darkest: sdColors.deepPurple["800"]
    },
    secondary: {
      lightest: sdColors.yellow["50"],
      lighter: sdColors.yellow["100"],
      light: sdColors.yellow["200"],
      default: sdColors.yellow["500"],
      dark: sdColors.yellow["600"],
      darker: sdColors.yellow["700"],
      darkest: sdColors.yellow["800"]
    },
    info: {
      lightest: sdColors.blue["50"],
      lighter: sdColors.blue["100"],
      light: sdColors.blue["200"],
      default: sdColors.blue["500"],
      dark: sdColors.blue["600"],
      darker: sdColors.blue["700"],
      darkest: sdColors.blue["800"]
    },
    success: {
      lightest: sdColors.green["50"],
      lighter: sdColors.green["100"],
      light: sdColors.green["300"],
      default: sdColors.green["500"],
      dark: sdColors.green["600"],
      darker: sdColors.green["700"],
      darkest: sdColors.green["800"]
    },
    warning: {
      lightest: sdColors.orange["50"],
      lighter: sdColors.orange["100"],
      light: sdColors.orange["200"],
      default: sdColors.orange["600"],
      dark: sdColors.orange["700"],
      darker: sdColors.orange["800"],
      darkest: sdColors.orange["900"]
    },
    danger: {
      lightest: sdColors.red["50"],
      lighter: sdColors.red["100"],
      light: sdColors.red["200"],
      default: sdColors.red["500"],
      dark: sdColors.red["700"],
      darker: sdColors.red["800"],
      darkest: sdColors.red["900"]
    }
  };

  public transColor = {
    darker: "rgba(0, 0, 0, .3)",
    dark: "rgba(0, 0, 0, .2)",
    default: "rgba(0, 0, 0, .1)",
    light: "rgba(255, 255, 255, .1)",
    lighter: "rgba(255, 255, 255, .2)"
  };

  public textColor = {
    dark: "black",
    default: "rgba(0, 0, 0, .87)",
    light: "rgba(0, 0, 0, .60)",
    lighter: "rgba(0, 0, 0, .38)"
  };

  public textReverseColor = {
    default: "white",
    dark: "rgba(255, 255, 255, .7)"
  };

  public gap = {
    xxs: "2px",
    xs: "4px",
    sm: "6px",
    default: "8px",
    lg: "12px",
    xl: "16px",
    xxl: "20px"
  };

  public fontSize = {
    lg: "14px",
    default: "12px",
    sm: "11px",
    h1: "24px",
    h2: "18px",
    h3: "16px",
    h4: "14px",
    h5: "12px",
    h6: "11px"
  };

  private _bgColor?: string;
  public get bgColor(): string {
    return this._bgColor || this.themeColor.grey.lightest;
  }

  public set bgColor(value: string) {
    this._bgColor = value;
  }

  public fontFamily = "'맑은 고딕', 'Malgun Gothic', 'AppleGothicNeoSD', 'Apple SD 산돌고딕 Neo', 'Microsoft NeoGothic', 'Droid Sans', sans-serif";
  public lineHeight = "1.25em";

  public zIndex = {
    toast: 9999,
    busy: 9998,
    dropdown: 5000,
    modal: 4000,
    fullScreen: 3000,
    sidebar: 2100,
    topbar: 2000
  };

  public media = {
    mobile: "screen and (max-width : 520px)"
  };

  public _topbarTheme?: string;
  public get topbarTheme(): string {
    return this._topbarTheme || this.themeColor.primary.default;
  }

  public set topbarTheme(variable: string) {
    this._topbarTheme = variable;
  }

  public _topbarLinkColor?: string;
  public get topbarLinkColor(): string {
    return this._topbarLinkColor || this.textReverseColor.dark;
  }

  public set topbarLinkColor(variable: string) {
    this._topbarLinkColor = variable;
  }

  public _topbarLinkHoverColor?: string;
  public get topbarLinkHoverColor(): string {
    return this._topbarLinkHoverColor || this.textReverseColor.default;
  }

  public set topbarLinkHoverColor(variable: string) {
    this._topbarLinkHoverColor = variable;
  }

  public get formControlBase(): string {
    return `
display: block;
width: 100%;
font-size: ${this.fontSize.default};
font-family: ${this.fontFamily};
line-height: ${this.lineHeight};
color: ${this.textColor.default};
padding: ${this.gap.sm} ${this.gap.default};

border: 1px solid transparent;
user-select: none`;
  }

  public stripUnit(str: string): number {
    return Number(str.replace(/[^0-9.]/g, ""));
  }

  public async applyAsync(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const prevStyle = document.getElementById("SdStyleProvider");
      if (prevStyle) {
        prevStyle.remove();
      }

      const styleEl = document.createElement("style");
      styleEl.setAttribute("id", "SdStyleProvider");

      less.render(
        stylesDefaults(this) + stylesClasses(this),
        (err, out) => {
          if (err) {
            reject(err);
            return;
          }

          styleEl.innerHTML = out.css.replace(/[\r\n]/g, "").replace(/\s\s/g, " ");
          document.head!.append(styleEl);
          resolve();
        }
      );
    });
  }
}

export abstract class SdControlBase implements OnDestroy {
  private readonly _$elRef: ElementRef<HTMLElement>;

  public abstract sdInitStyle(vars: SdStyleProvider): string;

  protected constructor(private readonly _$injector: Injector) {
    this._$elRef = this._$injector.get<ElementRef<HTMLElement>>(ElementRef);
    const style = this._$injector.get<SdStyleProvider>(SdStyleProvider);
    const uuid = "_" + Uuid.newUuid().toString().replace(/-/g, "");
    this._$elRef.nativeElement.setAttribute("sd-uuid", uuid);
    const styleEl = document.createElement("style");
    styleEl.setAttribute("id", uuid);
    less.render(
      this.sdInitStyle(style).replace(/:host/g, "[sd-uuid=" + uuid + "]"),
      (err, out) => {
        if (err) {
          throw err;
        }
        styleEl.innerHTML = out.css.replace(/[\r\n]/g, "").replace(/\s\s/g, " ");
        document.head!.append(styleEl);
      }
    );
  }

  public ngOnDestroy(): void {
    const uuid = this._$elRef.nativeElement.getAttribute("sd-uuid")!;
    document.getElementById(uuid)!.remove();
  }
}