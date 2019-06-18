<template>
  <div class="sd-card">
    <slot></slot>
  </div>
</template>

<script lang="ts">
  import {Component, Vue} from "vue-property-decorator";

  @Component
  export default class SdCardControl extends Vue {
  }
</script>

<style scoped lang="scss">
  @import "../scss/presets";

  .sd-card {
    display: block;
    background: white;
    border-radius: 2px;
    @include elevation(1);
    overflow: hidden;
  }
</style>
