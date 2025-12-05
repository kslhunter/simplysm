import { ISdServiceMessageDecodeResult, TSdServiceMessage } from "@simplysm/sd-service-common";

export interface ISdServiceProtocolWorker {
  methods: {
    encode: {
      params: [string, TSdServiceMessage];
      returnType: Buffer[];
    };
    decode: {
      params: [Buffer];
      returnType: ISdServiceMessageDecodeResult<TSdServiceMessage>;
    };
  };
  events: {};
}
