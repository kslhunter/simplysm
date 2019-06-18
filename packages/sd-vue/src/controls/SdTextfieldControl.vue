<template>
  <div class="sd-textfield"
       :sd-inset="inset"
       :sd-inline="inline"
       :sd-size="size">
    <input :type="type === 'number' ? 'text' : type === 'datetime' ? 'datetime-local' : type"
           :value="inputValue"
           :required="required"
           :placeholder="placeholder || ''"
           :pattern="pattern"
           :sd-invalid="isInvalid"
           @input="onInput"
           @focus="onFocus"
           @blur="onBlur"
           :disabled="disabled"
           :style="{'text-align': type === 'number' ? 'right' : undefined}"
           v-if="!multiline"/>
    <textarea :value="inputValue"
              :required="required"
              :placeholder="placeholder || ''"
              :pattern="pattern"
              :sd-invalid="isInvalid"
              @input="onInput"
              @focus="onFocus"
              @blur="onBlur"
              :disabled="disabled"
              :style="{'text-align': type === 'number' ? 'right' : undefined}"
              v-if="multiline"></textarea>
    <div class="_invalid-indicator"></div>
  </div>
</template>

<script lang="ts">
  import {Component, Emit, Prop, Vue, Watch} from "vue-property-decorator";
  import {DateOnly, DateTime, Time} from "@simplysm/sd-core";

  @Component
  export default class SdTextfieldControl extends Vue {
    @Prop({
      type: String,
      default: "text",
      validator: value => ["number", "text", "password", "date", "datetime", "time", "month", "year", "color", "email"].includes(value)
    })
    public type!: "number" | "text" | "password" | "date" | "datetime" | "time" | "month" | "year" | "color" | "email";

    @Prop(String)
    public placeholder?: string;

    @Prop(Boolean)
    public required?: boolean;

    @Prop([Number, String, DateOnly, DateTime, Time])
    public value?: number | string | DateOnly | DateTime | Time;

    @Prop(Boolean)
    public disabled?: boolean;

    @Prop(Number)
    public min?: number;

    @Prop(Number)
    public step?: number;

    @Prop(String)
    public pattern?: string;

    @Prop(Boolean)
    public inset?: boolean;

    @Prop(Boolean)
    public inline?: boolean;

    @Prop({
      type: String,
      validator: value => ["sm", "lg"].includes(value)
    })
    public size?: "sm" | "lg";

    @Prop(Boolean)
    public multiline?: boolean;

    @Emit("update:value")
    public updateValue(val?: number | string | DateOnly | DateTime | Time): number | string | DateOnly | DateTime | Time | undefined {
      return val;
    }

    @Emit("blur")
    public blur(event: FocusEvent): FocusEvent {
      return event;
    }

    @Emit("focus")
    public focus(event: FocusEvent): FocusEvent {
      return event;
    }

    @Watch("value", {immediate: true, deep: true})
    public onValueChanged(val?: number | string | DateOnly | DateTime | Time): void {
      this.inputValue = this._convertToInputValue(val);
      this.refreshIsInvalid();
    }

    public inputValue: string | undefined;
    public isInvalid = false;

    public onInput(event: Event): void {
      const inputEl = event.target as (HTMLInputElement | HTMLTextAreaElement);

      if (this.type === "number") {
        if (inputEl.value.includes(".")) {
          const split = inputEl.value.replace(/[^0-9.]/g, "").split(".");
          const integerPart = Number(split[0]).toLocaleString();
          this.inputValue = integerPart + "." + (split[1] || "");
        }
        else {
          this.inputValue = Number(inputEl.value.replace(/[^0-9.]/g, "")).toLocaleString();
        }
      }

      const realValue = this._convertToRealValue(inputEl.value);
      this.updateValue(realValue);

      this.refreshIsInvalid();
      this.$forceUpdate();
    }

    @Watch("type", {immediate: true})
    @Watch("min", {immediate: true})
    @Watch("step", {immediate: true})
    @Watch("required", {immediate: true})
    public refreshIsInvalid(): void {
      const realValue = this._convertToRealValue(this.inputValue);
      const hasMinError = this.min !== undefined && realValue !== undefined && this.type === "number" && realValue < this.min;
      const hasStepError = this.step !== undefined && realValue !== undefined && this.type === "number" && Math.abs(Number(realValue) % this.step) >= 1;
      const hasRequiredError = this.required && (realValue === "" || realValue === undefined);
      this.isInvalid = hasMinError || hasStepError || !!hasRequiredError;
    }

    private _convertToRealValue(inputValue?: string): number | string | DateOnly | DateTime | Time | undefined {
      if (this.type === "number") {
        return !inputValue ? undefined : Number(inputValue.replace(/[^0-9.]/g, ""));
      }
      else if (this.type === "year") {
        return !inputValue ? undefined : inputValue.length === 4 ? DateOnly.parse(inputValue) : inputValue;
      }
      else if (this.type === "date" || this.type === "month") {
        return !inputValue ? undefined : DateOnly.parse(inputValue);
      }
      else if (this.type === "datetime") {
        return !inputValue ? undefined : DateTime.parse(inputValue);
      }
      else if (this.type === "time") {
        return !inputValue ? undefined : Time.parse(inputValue);
      }
      else {
        return inputValue;
      }
    }

    private _convertToInputValue(realValue?: number | string | DateOnly | DateTime | Time): string | undefined {
      if (realValue === undefined) {
        return "";
      }
      else if (realValue instanceof DateTime) {
        return realValue.toFormatString("yyyy-MM-ddTHH:mm");
      }
      else if (realValue instanceof DateOnly) {
        if (this.type === "year") {
          return (realValue as DateOnly).toFormatString("yyyy");
        }
        else if (this.type === "month") {
          return (realValue as DateOnly).toFormatString("yyyy-MM");
        }
        else {
          return realValue.toString();
        }
      }
      else if (realValue instanceof Time) {
        return realValue.toFormatString("HH:mm");
      }
      else if (this.type === "number" && typeof realValue === "number") {
        if (!Number.isSafeInteger(realValue)) {
          const integerPart = Math.floor(realValue);
          return integerPart.toLocaleString() + "." + realValue.toString().split(".")[1];
        }
        else {
          return realValue.toLocaleString();
        }
      }
      else {
        return realValue as string | undefined;
      }
    }

    public onFocus(event: FocusEvent): void {
      event.preventDefault();
      this.focus(event);
    }

    public onBlur(event: FocusEvent): void {
      event.preventDefault();
      this.blur(event);
    }
  }
</script>

<style scoped lang="scss">
  @import "../scss/presets";

  .sd-textfield {
    display: block;
    position: relative;

    > input,
    > textarea {
      @include form-control-base();
      background-clip: padding-box;
      border-radius: 0;
      margin: 0;

      background-color: var(--theme-secondary-lightest);
      border-color: var(--trans-color-default);
      transition: outline-color .1s linear;
      outline: 1px solid transparent;
      outline-offset: -1px;

      &::-webkit-input-placeholder {
        color: var(--text-color-lighter);
      }

      &::-webkit-outer-spin-button,
      &::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }

      &::-webkit-calendar-picker-indicator {
        background: transparent;
        color: var(--text-color-default);
        cursor: pointer;
      }

      &:focus {
        outline-color: var(--theme-primary-default);
      }

      &:disabled {
        background: var(--theme-grey-lightest) !important;
        color: var(--text-color-light);
      }

      &[type='color'] {
        padding: 1px var(--gap-default) !important;
        height: calc(var(--gap-sm) * 2 + var(--line-height) * var(--font-size-default) + 2);
      }

      &[type=year],
      &[type=month],
      &[type=date],
      &[type=datetime],
      &[type=time],
      &[type=datetime-local] {
        padding: calc(var(--gap-sm) - 1) var(--gap-default);
      }
    }

    > ._invalid-indicator {
      display: none;
    }

    > input[sd-invalid=true] + ._invalid-indicator,
    > input:invalid + ._invalid-indicator {
      @include invalid-indicator();
    }

    &[sd-inset=true] {
      height: 100%;

      > input,
      > textarea {
        display: block;
        border: none;
      }

      > textarea {
        height: 100%;
        resize: none;
      }
    }

    &[sd-inline=true] {
      display: inline-block;
    }

    &[sd-size=sm] > input,
    &[sd-size=sm] > textarea {
      padding: var(--gap-xs) var(--gap-sm);
    }

    &[sd-size=lg] > input,
    &[sd-size=lg] > textarea {
      padding: var(--gap-default) var(--gap-lg);
    }

    @each $key, $val in map_get($root, theme) {
      @each $key1, $val1 in $val {
        &.sd-text-color-#{$key}-#{$key1} {
          > input,
          > textarea {
            color: var(--theme-#{$key}-#{$key1}) !important;
          }
        }
      }
    }
  }
</style>
