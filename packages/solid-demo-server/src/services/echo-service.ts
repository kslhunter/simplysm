import { ServiceBase } from "@simplysm/service-server";

export class EchoService extends ServiceBase {
  echo(message: string): string {
    return message;
  }

  echoJson<T>(data: T): T {
    return data;
  }
}
