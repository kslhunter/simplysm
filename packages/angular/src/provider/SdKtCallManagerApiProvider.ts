// import {Injectable} from "@angular/core";
// import {SdSocketProvider} from "./SdSocketProvider";
//
// export class KtCallManagerApi {
//   public constructor(private readonly _socket: SdSocketProvider,
//                      private readonly _workerId: number) {
//   }
//
//   public async closeAsync(): Promise<void> {
//     await this._socket.sendAsync("KtCallManagerApiService.closeAsync", [this._workerId]);
//   }
//
//   public async loginAsync(isProduction: boolean, apiKey: string, loginId: string, password: string): Promise<void> {
//     await this._socket.sendAsync("KtCallManagerApiService.loginAsync", [this._workerId, isProduction, apiKey, loginId, password]);
//   }
// }
//
// @Injectable()
// export class SdKtCallManagerApiProvider {
//   private _apis: KtCallManagerApi[] = [];
//
//   public constructor(private readonly _socket: SdSocketProvider) {
//   }
//
//   public async createAsync(): Promise<KtCallManagerApi> {
//     const workerId = await this._socket.sendAsync("KtCallManagerApiService.createAsync", []);
//     const api = new KtCallManagerApi(this._socket, workerId);
//     this._apis.push(api);
//     return api;
//   }
//
//   public async closeAllAsync(): Promise<void> {
//     for (const api of this._apis) {
//       await api.closeAsync();
//     }
//     this._apis = [];
//   }
// }
