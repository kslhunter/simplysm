import type { ServiceMessageDecodeResult, ServiceMessage } from "@simplysm/service-common";

export interface ServiceProtocolWorker {
  methods: {
    encode: {
      params: [string, ServiceMessage];
      returnType: { chunks: Uint8Array[]; totalSize: number };
    };
    decode: {
      params: [Uint8Array];
      returnType: ServiceMessageDecodeResult<ServiceMessage>;
    };
  };
  events: Record<string, never>;
}
