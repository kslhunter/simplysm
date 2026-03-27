import { WebPlugin } from "@capacitor/core";
import { IActivityResult, IIntentPlugin, IIntentResult, IStartActivityForResultOptions } from "../IIntentPlugin";

export class IntentWeb extends WebPlugin implements IIntentPlugin {
  async subscribe(
    _options: { filters: string[] },
    _callback: (result: IIntentResult) => void,
  ): Promise<{ id: string }> {
    alert("[Intent] 웹 환경에서는 Intent를 지원하지 않습니다.");
    return await Promise.resolve({ id: "web-stub" });
  }

  async unsubscribe(_options: { id: string }): Promise<void> {
    await Promise.resolve();
  }

  async unsubscribeAll(): Promise<void> {
    await Promise.resolve();
  }

  async send(_options: { action: string; extras?: Record<string, unknown> }): Promise<void> {
    alert("[Intent] 웹 환경에서는 Intent를 지원하지 않습니다.");
    await Promise.resolve();
  }

  async getLaunchIntent(): Promise<IIntentResult> {
    return await Promise.resolve({});
  }

  async startActivityForResult(_options: IStartActivityForResultOptions): Promise<IActivityResult> {
    alert("[Intent] 웹 환경에서는 startActivityForResult를 지원하지 않습니다.");
    return await Promise.resolve({ resultCode: 0 });
  }
}
