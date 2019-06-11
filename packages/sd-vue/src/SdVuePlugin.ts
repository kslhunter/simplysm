import Vue from "vue";
import SdButtonControl from "./controls/ButtonControl.vue";

export default class SdVuePlugin {
  public static install(vue: Vue): void {
    Vue.component("sd-button", SdButtonControl);
  }
}