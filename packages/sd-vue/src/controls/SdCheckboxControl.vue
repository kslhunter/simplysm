<template>
  <div class="sd-checkbox"
       :sd-checked="value"
       :sd-inline="inline"
       :sd-radio="radio"
       :sd-size="size"
       :sd-theme="theme">
    <label tabindex="0" @keydown="onKeydown">
      <input :checked="inputValue" @change="onValueChange" type="checkbox" hidden :disabled="disabled">
      <div class="_indicator_rect"></div>
      <fa-icon class="_indicator" icon="icon" fixed-width v-if="!radio"></fa-icon>
      <div class="_indicator" v-if="radio">
        <div></div>
      </div>
      <div class="_content">
        <ng-content></ng-content>
      </div>
    </label>
  </div>
</template>

<script lang="ts">
  import {Component, Emit, Prop, Vue} from "vue-property-decorator";
  import {IconName} from "@fortawesome/fontawesome-svg-core";
  import {fas} from "@fortawesome/free-solid-svg-icons";
  import {far} from "@fortawesome/free-regular-svg-icons";
  import {fab} from "@fortawesome/free-brands-svg-icons";

  export const sdIconNames = Object.values({...fas, ...far, ...fab})
    .map(item => item["iconName"]).distinct();

  @Component
  export default class SdCheckboxControl extends Vue {
    @Prop({
      type: Boolean,
      default: false
    })
    public value!: boolean;

    @Prop(Boolean)
    public disabled?: boolean;
    @Prop(Boolean)
    public inline?: boolean;

    @Prop(Boolean)
    public radio?: boolean;

    @Prop({
      type: String,
      validator: value => ["sm", "lg"].includes(value)
    })
    public size?: "sm" | "lg";

    @Prop({
      type: String,
      validator: value => ["primary", "secondary", "info", "success", "warning", "danger"].includes(value)
    })
    public theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger";

    @Prop({
      type: String,
      default: "check"
    })
    public icon!: IconName;

    @Emit("update:value")
    public updateValue(val: boolean): boolean {
      return val;
    }

    public inputValue = false;

    public mounted(): void {
      this.$watch(
        () => this.value,
        () => {
          this.inputValue = this.value;
          this.$forceUpdate();
        },
        {immediate: true}
      );
    }

    public onValueChange(event: Event): void {
      const el = event.target as HTMLInputElement;
      this.inputValue = el.checked;
      this.updateValue(this.inputValue);
    }

    public onKeydown(event: KeyboardEvent): void {
      if (this.disabled) return;

      if (event.key === " ") {
        this.inputValue = !this.inputValue;
        this.updateValue(this.inputValue);
      }
    }
  }
</script>

<style scoped lang="scss">
  @import "../scss/presets";

  .sd-checkbox {
    --sd-checkbox-size: calc(var(--line-height) * var(--font-size-default));

    color: var(--text-color-default);

    > label {
      @include form-control-base();
      color: inherit;
      cursor: pointer;
      position: relative;

      > ._indicator_rect {
        position: absolute;
        display: block;
        width: var(--sd-checkbox-size);
        height: var(--sd-checkbox-size);
        border: 1px solid var(--trans-color-default);
        vertical-align: top;
        transition: border-color .1s linear;
        background: var(--theme-secondary-lightest);
      }

      > ._indicator {
        display: inline-block;
        position: relative;
        opacity: 0;
        transition: opacity .1s linear;
        color: var(--text-color-default);
        width: var(--sd-checkbox-size);
        height: var(--sd-checkbox-size);
        vertical-align: top;
        font-size: var(--font-size-default);
        text-indent: 1px;
      }

      > ._content {
        display: inline-block;
        vertical-align: top;
        text-indent: var(--gap-sm);

        > * {
          text-indent: 0;
        }
      }

      > input:disabled + ._indicator_rect {
        background: var(--theme-grey-lightest) !important;
      }

      &:focus {
        outline-color: transparent;

        > ._indicator_rect {
          border-color: var(--theme-primary-default);
        }
      }
    }

    &[sd-checked=true] {
      > label {
        > ._indicator {
          opacity: 1;
        }
      }
    }

    &[sd-inline=true] {
      display: inline-block;

      > label {
        padding-left: 0;
      }
    }

    &[sd-radio=true] {
      > label {
        > ._indicator_rect {
          border-radius: 100%;
        }

        > ._indicator {
          padding: var(--gap-xs);
        }

        > ._indicator > div {
          border-radius: 100%;
          background: var(--text-color-default);
          width: 100%;
          height: 100%;
        }
      }
    }

    &[sd-size=sm] > label {
      padding: var(--gap-xs) var(--gap-sm);
    }

    &[sd-size=lg] > label {
      padding: var(--gap-default) var(--gap-lg);
    }

    @each $key, $val in map_get($root, theme) {
      &[sd-theme=#{$key}] > label {
        > ._indicator_rect {
          background: var(--theme-#{$key}-lightest);
        }

        > ._indicator {
          color: var(--theme-#{$key}-default);
        }

        &:focus {
          > ._indicator_rect {
            border-color: var(--theme-#{$key}-default);
          }
        }
      }
    }
  }

</style>
