<template>
  <div class="sd-barcode">
    <canvas></canvas>
  </div>
</template>

<script lang="ts">
  import {Component, Prop, Vue} from "vue-property-decorator";

  // tslint:disable-next-line:no-var-requires no-require-imports
  require("jsbarcode");

  @Component
  export default class SdBarcodeControl extends Vue {
    @Prop(String)
    public value?: string;

    @Prop({type: String, default: "code128"})
    public type!: string;

    @Prop({type: Number, default: 1})
    public lineWidth!: number;

    @Prop({type: Number, default: 58})
    public height!: number;

    public mounted(): void {
      this.$watch(
        () => [
          this.value,
          this.type,
          this.lineWidth,
          this.height
        ],
        this.refresh.bind(this),
        {immediate: true}
      );
    }

    public refresh(): void {
      if (this.value && this.$el) {
        const canvasEl = this.$el.firstChild as HTMLCanvasElement;

        if (canvasEl) {
          window["JsBarcode"](
            canvasEl,
            this.value,
            {
              format: this.type,
              width: this.lineWidth,
              height: this.height,
              fontOptions: "bold",
              fontSize: this.lineWidth * 12
            }
          );
        }
      }
    }
  }
</script>

<style scoped lang="scss">
  @import "../scss/presets";

  .sd-barcode {
  }
</style>
