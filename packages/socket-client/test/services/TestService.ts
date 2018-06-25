import {SocketServiceBase} from "@simplism/socket-server";

export class TestService extends SocketServiceBase {
  public async getValue(val: string): Promise<string> {
    return "value: " + val;
  }

  public async throwError(val: string): Promise<void> {
    throw new Error("value: " + val);
  }
}