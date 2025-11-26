import { SdServiceClient } from "../SdServiceClient";

export class SdServiceClientBase<T extends { [K in keyof T]: (...args: any[]) => any }> {
  constructor(
    private readonly _client: SdServiceClient,
    private readonly _serviceName: string,
  ) {}

  protected async call<K extends keyof T>(
    method: K,
    params: Parameters<T[K]>,
  ): Promise<Awaited<ReturnType<T[K]>>> {
    return await this._client.sendAsync(this._serviceName, method as string, params);
  }
}
