import {SdStyleProvider} from "../../provider/SdStyleProvider";

export const stylesSdPagination = (vars: SdStyleProvider) => /* language=LESS */ `
  sd-pagination {
    display: block;
    /*height: 15px;*/

    > a {
      display: inline-block;
      // padding: ${vars.gap.xs} ${vars.gap.sm};
      padding: 0 ${vars.gap.xs};

      &[sd-selected=true] {
        text-decoration: underline;
      }
    }
  }`;
