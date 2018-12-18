import {SdStyleProvider} from "../provider/SdStyleProvider";

export const stylesDefaults = (vars: SdStyleProvider) => /* language=LESS */ `
  *,
  *:after,
  *:before {
    box-sizing: border-box;
  }

  *:focus {
    outline-color: ${vars.themeColor.primary.default};
  }

  html, body {
    height: 100%;
    width: 100%;
    padding: 0;
    margin: 0;
  }

  body {
    background: ${vars.bgColor};
    color: ${vars.textColor.default};
    font-family: ${vars.fontFamily};
    font-size: ${vars.fontSize.default};
    line-height: ${vars.lineHeight};
  }

  pre {
    font-family: ${vars.fontFamily};
    font-size: ${vars.fontSize.default};
    line-height: ${vars.lineHeight};
    margin: 0;
  }` +

  [1, 2, 3, 4, 5, 6].map(num => `
    h${num} {
      font-size: ${vars.fontSize["h" + num]};
      line-height: ${vars.lineHeight};
      margin: 0;
    }`
  ).join("\n") + `
  
  a {
    display: inline-block;
    cursor: pointer;
    color: ${vars.themeColor.primary.default};

    &:focus {
      outline-color: transparent;
    }

    &:hover,
    &:focus {
      color: ${vars.themeColor.primary.dark};
    }
  }

  ::-webkit-scrollbar-track {
    background-color: rgba(${vars.themeColor.grey.darker}, .1);
  }

  ::-webkit-scrollbar-corner {
    background-color: rgba(${vars.themeColor.grey.light}, .1);
  }

  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
    background-color: rgba(0, 0, 0, 0);

    /*border-top: 1px solid get($trans-color, dark);
    border-bottom: 1px solid get($trans-color, default);*/
  }

  ::-webkit-scrollbar-thumb {
    background-color: rgba(${vars.themeColor.grey.darker}, .15);

    /*border-top: 1px solid get($trans-color, default);
    border-bottom: 1px solid get($trans-color, dark);*/
  }`;