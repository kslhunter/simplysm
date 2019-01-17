import {SdColors} from "./SdColors";

export class SdStyleVariables {
  public themeColor = {
    grey: {
      lightest: SdColors.Grey200,
      lighter: SdColors.Grey300,
      light: SdColors.Grey400,
      default: SdColors.Grey500,
      dark: SdColors.Grey600,
      darker: SdColors.Grey700,
      darkest: SdColors.Grey800
    },
    bluegrey: {
      lightest: SdColors.BlueGrey200,
      lighter: SdColors.BlueGrey300,
      light: SdColors.BlueGrey400,
      default: SdColors.BlueGrey500,
      dark: SdColors.BlueGrey600,
      darker: SdColors.BlueGrey800,
      darkest: SdColors.BlueGrey900
    },
    primary: {
      lightest: SdColors.DeepPurple50,
      lighter: SdColors.DeepPurple100,
      light: SdColors.DeepPurple200,
      default: SdColors.DeepPurple500,
      dark: SdColors.DeepPurple600,
      darker: SdColors.DeepPurple700,
      darkest: SdColors.DeepPurple800
    },
    secondary: {
      lightest: SdColors.Yellow50,
      lighter: SdColors.Yellow100,
      light: SdColors.Yellow200,
      default: SdColors.Yellow500,
      dark: SdColors.Yellow600,
      darker: SdColors.Yellow700,
      darkest: SdColors.Yellow800
    },
    info: {
      lightest: SdColors.Blue50,
      lighter: SdColors.Blue100,
      light: SdColors.Blue200,
      default: SdColors.Blue500,
      dark: SdColors.Blue600,
      darker: SdColors.Blue700,
      darkest: SdColors.Blue800
    },
    success: {
      lightest: SdColors.Green50,
      lighter: SdColors.Green100,
      light: SdColors.Green300,
      default: SdColors.Green500,
      dark: SdColors.Green600,
      darker: SdColors.Green700,
      darkest: SdColors.Green800
    },
    warning: {
      lightest: SdColors.Orange50,
      lighter: SdColors.Orange100,
      light: SdColors.Orange200,
      default: SdColors.Orange600,
      dark: SdColors.Orange700,
      darker: SdColors.Orange800,
      darkest: SdColors.Orange900
    },
    danger: {
      lightest: SdColors.Red50,
      lighter: SdColors.Red100,
      light: SdColors.Red200,
      default: SdColors.Red500,
      dark: SdColors.Red700,
      darker: SdColors.Red800,
      darkest: SdColors.Red900
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
    xxs: "4px",
    xs: "6px",
    sm: "8px",
    default: "10px",
    lg: "16px",
    xl: "20px",
    xxl: "24px"
  };

  public fontSize = {
    lg: "16px",
    default: "14px",
    sm: "12px",
    h1: "26px",
    h2: "20px",
    h3: "18px",
    h4: "16px",
    h5: "14px",
    h6: "12px"
  };

  public fontFamily = "'Noto Sans KR', '맑은 고딕', 'Malgun Gothic', 'AppleGothicNeoSD', 'Apple SD 산돌고딕 Neo', 'Microsoft NeoGothic', 'Droid Sans', sans-serif";
  public fontFamilyMonospace = "'Noto Sans KR1', monospace";
  public lineHeight = "1.4em";

  public zIndex = {
    toast: 9999,
    busy: 9998,
    dropdown: 5000,
    modal: 4000,
    fullScreen: 3000,
    sidebar: 2100,
    topbar: 2000
  };

  private _bgColor?: string;
  public get bgColor(): string {
    return this._bgColor || this.themeColor.grey.lightest;
  }

  public set bgColor(value: string) {
    this._bgColor = value;
  }

  public media = {
    mobile: "screen and (max-width : 520px)"
  };

  public _topbarTheme?: string;
  public get topbarTheme(): string {
    return this._topbarTheme || this.themeColor.bluegrey.darkest;
  }

  public set topbarTheme(variable: string) {
    this._topbarTheme = variable;
  }

  public _topbarLinkColor?: string;
  public get topbarLinkColor(): string {
    return this._topbarLinkColor || this.themeColor.secondary.default;
  }

  public set topbarLinkColor(variable: string) {
    this._topbarLinkColor = variable;
  }

  public _topbarLinkHoverColor?: string;
  public get topbarLinkHoverColor(): string {
    return this._topbarLinkHoverColor || this.topbarLinkColor;
  }

  public set topbarLinkHoverColor(variable: string) {
    this._topbarLinkHoverColor = variable;
  }

  public topbarHeight = "42px";

  public sidebarWidth = "240px";

  public sheetPaddingV = this.gap.xs;
  public sheetPaddingH = this.gap.sm;
}
