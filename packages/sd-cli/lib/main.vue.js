// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
const Vue = require("vue").default;
const App = require("SIMPLYSM_CLIENT_APP_VUE").default;
const router = require("SIMPLYSM_CLIENT_ROUTER").default;

Vue.config.productionTip = false;

new Vue({
  router,
  render: (h) => h(App),
}).$mount('#app');
