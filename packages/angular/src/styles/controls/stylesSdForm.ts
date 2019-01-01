import {SdStyleProvider} from "../../provider/SdStyleProvider";

export const stylesSdForm = (vars: SdStyleProvider) => /* language=LESS */ `
  sd-form {
    &[sd-inline=true] {
      display: inline-block;
      //overflow: hidden;
      vertical-align: middle;
  
      > form {
        display: inline-block;
        margin-bottom: -${vars.gap.sm};
  
        > sd-form-item {
          display: inline-block;
          margin-bottom: ${vars.gap.sm};
          margin-right: ${vars.gap.default};
  
          &:last-child {
            margin-right: 0;
          }
  
          > label {
            display: inline-block;
            vertical-align: middle;
            margin-right: ${vars.gap.sm};
            margin-bottom: 0;
          }
  
          > div {
            display: inline-block;
            vertical-align: middle;
  
            > sd-checkbox > label {
              display: inline-block;
              width: auto;
            }
          }
        }
      }
    }
  }`;
