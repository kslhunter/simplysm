import {SdServiceServer} from "./SdServiceServer";
import {SdServiceServerConnection} from "./SdServiceServerConnection";
import {ISdServiceRequest} from "../commons";

export class SdServiceBase {
  public constructor(public server: SdServiceServer,
                     public conn: SdServiceServerConnection,
                     public request: ISdServiceRequest,
                     public rootPath: string) {
  }
}
