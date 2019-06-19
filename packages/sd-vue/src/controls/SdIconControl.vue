<template>
  <div class="sd-icon"
       :sd-fw="fw">
    <fa-icon :icon="faIconProp" :fixed-width="fw" :size="size" v-if="faIconProp"></fa-icon>
  </div>
</template>

<script lang="ts">
  import {sdIconNames} from "../commons/sdIconNames";
  import {IconName, IconProp, SizeProp} from "@fortawesome/fontawesome-svg-core";
  import {Component, Prop, Vue} from "vue-property-decorator";

  @Component
  export default class SdIconControl extends Vue {
    @Prop({
      type: String,
      validator: value => sdIconNames.includes(value)
    })
    public icon?: IconName;

    @Prop(Boolean)
    public fw?: boolean;

    @Prop({
      type: String,
      validator: value => ["solid", "regular", "brands"].includes(value),
      default: "solid"
    })
    public type!: "solid" | "regular" | "brands";

    @Prop({
      type: String,
      validator: value => ["xs", "lg", "sm", "1x", "2x", "3x", "4x", "5x", "6x", "7x", "8x", "9x", "10x"].includes(value)
    })
    public size?: SizeProp;

    public faIconProp: IconProp | undefined = undefined;

    public data(): any {
      return {faIconProp: undefined};
    }

    public mounted(): void {
      this.$watch(
        () => [
          this.icon,
          this.type
        ],
        () => {
          this.faIconProp = this.icon ? [
            this.type === "brands" ? "fab" : this.type === "regular" ? "far" : "fas",
            this.icon
          ] : undefined;
          this.$forceUpdate();
        },
        {immediate: true}
      );
    }
  }
</script>

<style scoped lang="scss">
  @import "../scss/presets";

  .sd-icon {
    &[sd-fw=true] {
      display: inline-block;
      width: 1.25em;
    }
  }
</style>
