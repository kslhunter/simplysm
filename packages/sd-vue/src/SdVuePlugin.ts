import SdButtonControl from "./controls/SdButtonControl.vue";
import {PluginFunction} from "vue";

//tslint:disable-next-line:variable-name
const SdVuePlugin: PluginFunction<any> = Vue => {
  Vue.component("sd-button", SdButtonControl);
};
export default SdVuePlugin;