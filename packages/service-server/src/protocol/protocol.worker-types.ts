import type { ServiceMessageDecodeResult, ServiceMessage } from "@simplysm/service-common";

export interface ServiceProtocolWorker {
  methods: {
    encode: {
      params: [string, ServiceMessage];
      returnType: { chunks: Buffer[]; totalSize: number };
    };
    decode: {
      params: [Buffer];
      returnType: ServiceMessageDecodeResult<ServiceMessage>;
    };
  };
  events: Record<string, never>;
}
