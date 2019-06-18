<template>
  <div class="sd-button"
       :sd-theme="theme"
       :sd-size="size"
       :sd-inline="inline"
       :sd-inset="inset"
       :sd-invalid="isInvalid"
       @click="onClick">
    <button :type="type" :disabled="disabled">
      <slot></slot>
    </button>
    <div class="_invalid-indicator"></div>
  </div>
</template>

<script lang="ts">
  import {Component, Emit, Prop, Vue} from "vue-property-decorator";

  @Component
  export default class SdButtonControl extends Vue {
    @Prop({
      type: String,
      validator: value => ["primary", "secondary", "info", "success", "warning", "danger"].includes(value)
    })
    public theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger";

    @Prop({
      type: String,
      validator: value => ["sm", "lg"].includes(value)
    })
    public size?: "sm" | "lg";

    @Prop({
      type: String,
      default: "button",
      validator: value => ["button", "submit"].includes(value)
    })
    public type!: "button" | "submit";

    @Prop(Boolean)
    public inline?: boolean;

    @Prop(Boolean)
    public required?: boolean;

    @Prop(Boolean)
    public disabled?: boolean;

    @Prop(Boolean)
    public inset?: boolean;

    public isInvalid = false;

    @Emit()
    public click(event: MouseEvent): MouseEvent {
      return event;
    }

    public onClick(event: MouseEvent): void {
      this.click(event);
    }

    public mounted(): void {
      this._refresh();
    }

    public updated(): void {
      this._refresh();
    }

    private _refresh(): void {
      this.isInvalid = this.required === true && !(this.$el.firstChild as HTMLElement).innerText.trim();
    }
  }
</script>

<style scoped lang="scss">
  @import "../scss/presets";

  .sd-button {
    display: block;
    position: relative;

    > button {
      @include form-control-base();

      font-weight: bold;
      background: white;
      cursor: pointer;
      color: var(--theme-primary-default);
      border-radius: 3px;

      &:hover {
        background: var(--theme-grey-lightest);
      }

      &:focus {
        outline-color: transparent;
        background: var(--theme-grey-lightest);
      }

      &:active {
        background: var(--theme-grey-lighter);
      }

      &:disabled {
        background: transparent;
        cursor: default;
        color: var(--text-color-default);
      }
    }

    @each $key, $val in map_get($root, theme) {
      &[sd-theme=#{$key}] > button {
        background: var(--theme-#{$key}-default);
        border-color: var(--theme-#{$key}-default);
        color: var(--text-reverse-color-default);

        &:hover,
        &:focus {
          background: var(--theme-#{$key}-dark);
          border-color: var(--theme-#{$key}-dark);
        }

        &:active {
          background: var(--theme-#{$key}-darker);
          border-color: var(--theme-#{$key}-darker);
        }

        &:disabled {
          background: var(--theme-grey-default);
          border-color: var(--theme-grey-default);
          cursor: default;
        }
      }
    }

    &[sd-size=sm] > button {
      padding: var(--gap-xs) var(--gap-sm);
    }

    &[sd-size=lg] > button {
      padding: var(--gap-default) var(--gap-lg);
    }

    &[sd-inline=true] {
      display: inline-block;

      > button {
        width: 100%;
      }
    }

    &[sd-invalid=true] > ._invalid-indicator {
      @include invalid-indicator();
    }

    &[sd-inset=true] {
      > button {
        border: none !important;
        box-shadow: none !important;
        border-radius: 0;
        color: var(--theme-primary-default);

        &:hover {
          background: var(--theme-grey-lightest);
        }

        &:active {
          background: var(--theme-grey-lighter);
        }

        &:disabled {
          background: transparent;
        }
      }

      @each $key, $val in get($root, theme) {
        &[sd-theme=#{$key}] > button {
          background: var(--theme-#{$key}-default);

          &:hover {
            background: var(--theme-#{$key}-dark);
          }

          &:active {
            background: var(--theme-#{$key}-darker);
          }

          &:disabled {
            background: var(--theme-grey-default);
          }
        }
      }
    }
  }
</style>
