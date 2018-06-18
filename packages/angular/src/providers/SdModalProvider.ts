import {Injectable} from "@angular/core";
import {NotImplementedException, Type} from "../../../core/src";

export interface IModalBase<P, R> {
  sdOnOpen(param: P): Promise<void>;
}

@Injectable()
export class SdModalProvider {
  public async show<T extends IModalBase<P, R>, P, R>(type: Type<T>, title: string, params: P): Promise<R> {
    throw new NotImplementedException();
  }
}