import Vue, {PluginObject} from "vue";
import SdButtonControl from "./controls/ButtonControl.vue";

export default class SdVuePlugin implements PluginObject<any> {
  public install(vue: typeof Vue, options?: any): void {
    vue.component("sd-button", SdButtonControl);
  }
}