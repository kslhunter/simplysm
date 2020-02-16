import {Injectable} from "@angular/core";

@Injectable()
export class SdSystemLogProvider {
  public writeFn?: (data: any) => Promise<void>;

  public async write(data: any): Promise<void> {
    if (this.writeFn) {
      await this.writeFn(data);
    }
  }
}