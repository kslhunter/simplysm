import SdButtonControl from "./controls/SdButtonControl.vue";
import {PluginFunction} from "vue";
import SdTextfieldControl from "./controls/SdTextfieldControl.vue";
import SdBusyContainerControl from "./controls/SdBusyContainerControl.vue";
import SdBarcodeControl from "./controls/SdBarcodeControl.vue";

//tslint:disable-next-line:variable-name
const SdVuePlugin: PluginFunction<any> = Vue => {
  Vue.component("sd-button", SdButtonControl);
  Vue.component("sd-textfield", SdTextfieldControl);
  Vue.component("sd-busy-container", SdBusyContainerControl);
  Vue.component("sd-barcode", SdBarcodeControl);
};
export default SdVuePlugin;
