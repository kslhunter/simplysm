import {SdStyleProvider} from "../../provider/SdStyleProvider";

export const stylesSdFormItem = (vars: SdStyleProvider) => /* language=LESS */ `
  sd-form-item {
    display: block;
    margin-bottom: ${vars.gap.default};
  
    &:last-child {
      margin-bottom: 0;
    }
  
    & > label {
      display: block;
      font-weight: bold;
      margin-bottom: ${vars.gap.xs};
    }
  
    /*@media ${vars.media.mobile} {
      width: 100%;
      margin: 0;
      overflow-x: hidden;
  
      > label {
        padding: ${vars.gap.xs} ${vars.gap.sm};
        font-size: ${vars.fontSize.sm};
        background: rgba(0, 0, 0, .1);
        margin: 0;
      }
  
      > div {
        > sd-textfield > input {
          border: none;
        }
  
        > sd-markdown-editor {
          border: none;
        }
  
        > sd-select > select {
          border: none;
        }
  
        > sd-multi-select > sd-dropdown > div {
          border: none;
        }
      }
    }*/
  }`;