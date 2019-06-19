import SdButtonControl from "./controls/SdButtonControl.vue";
import {PluginFunction} from "vue";
import {library} from "@fortawesome/fontawesome-svg-core";
import {fas} from "@fortawesome/free-solid-svg-icons";
import {far} from "@fortawesome/free-regular-svg-icons";
import {fab} from "@fortawesome/free-brands-svg-icons";
import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome";

import SdTextfieldControl from "./controls/SdTextfieldControl.vue";
import SdBusyContainerControl from "./controls/SdBusyContainerControl.vue";
import SdBarcodeControl from "./controls/SdBarcodeControl.vue";
import SdCardControl from "./controls/SdCardControl.vue";
import SdCheckboxControl from "./controls/SdCheckboxControl.vue";
import SdIconControl from "./controls/SdIconControl.vue";

//tslint:disable-next-line:variable-name
const SdVuePlugin: PluginFunction<any> = Vue => {
  library.add(fas, far, fab);
  Vue.component("fa-icon", FontAwesomeIcon);

  Vue.component("sd-button", SdButtonControl);
  Vue.component("sd-textfield", SdTextfieldControl);
  Vue.component("sd-busy-container", SdBusyContainerControl);
  Vue.component("sd-barcode", SdBarcodeControl);
  Vue.component("sd-card", SdCardControl);
  Vue.component("sd-checkbox", SdCheckboxControl);
  Vue.component("sd-icon", SdIconControl);
};
export default SdVuePlugin;
