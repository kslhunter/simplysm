import {Injectable, OnDestroy, Type} from "@angular/core";
import {WebSocketClient} from "@simplism/websocket-client";

@Injectable()
export class SdWebSocketProvider implements OnDestroy {
  public ws = new WebSocketClient();

  public async connectAsync(url: string): Promise<void> {
    await this.ws.connectAsync(url);
  }

  public async sendAsync<S, R>(serviceType: Type<S>, methodFunc: (service: S) => Promise<R>): Promise<R> {
    const serviceName = serviceType.name;

    const matches = methodFunc
      .toString()
      .match(/function\s?\(([^)]*)\)\s?{((?!return).)*return\s+([^(]*)\(((.|\n|\r)*)\);?\s?}$/);
    const fieldName = matches![1];
    const method = matches![3];
    const methodName = method.replace(`${fieldName}.`, "");

    const serviceObj: S = {} as any;
    serviceObj[methodName] = async (...args: any[]) => await this.ws.sendAsync(`${serviceName}.${methodName}`, ...args);
    return await methodFunc(serviceObj);
  }

  public async ngOnDestroy(): Promise<void> {
    if (this.ws.connected) {
      await this.ws.closeAsync();
    }
  }
}