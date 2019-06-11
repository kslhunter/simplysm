<template>
  <div class="sd-button">
    버튼: <slot></slot>
  </div>
</template>

<script lang="ts">
  import {Component, Vue} from "vue-property-decorator";

  @Component({})
  export default class SdButtonControl extends Vue {
  }
</script>

<style scoped lang="scss">
</style>
