import { WebPlugin } from "@capacitor/core";
export class BroadcastWeb extends WebPlugin {
  async subscribe(_options, _callback) {
    alert("[Broadcast] 웹 환경에서는 Broadcast를 지원하지 않습니다.");
    return await Promise.resolve({ id: "web-stub" });
  }
  async unsubscribe(_options) {
    await Promise.resolve();
  }
  async unsubscribeAll() {
    await Promise.resolve();
  }
  async send(_options) {
    alert("[Broadcast] 웹 환경에서는 Broadcast를 지원하지 않습니다.");
    await Promise.resolve();
  }
  async getLaunchIntent() {
    return await Promise.resolve({});
  }
}
//# sourceMappingURL=BroadcastWeb.js.map
