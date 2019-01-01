import {SdStyleProvider} from "../../provider/SdStyleProvider";

export const stylesSdCard = (vars: SdStyleProvider) => /* language=LESS */ `
  sd-card {
   display: block;
   width: 100%;
   background: white;
   //border: 1px solid ${vars.transColor.default};
   ${vars.elevation(1)};
  }`;
