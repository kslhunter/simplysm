import type { IServiceMessageDecodeResult, TServiceMessage } from "@simplysm/service-common";

export interface IServiceProtocolWorker {
  methods: {
    encode: {
      params: [string, TServiceMessage];
      returnType: { chunks: Buffer[]; totalSize: number };
    };
    decode: {
      params: [Buffer];
      returnType: IServiceMessageDecodeResult<TServiceMessage>;
    };
  };
  events: Record<string, never>;
}
