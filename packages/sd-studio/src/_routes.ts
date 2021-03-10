export const routes = [
  {
    path: "db-model",
    loadChildren: "./_modules/pages/DbModelPageRoutingModule#DbModelPageRoutingModule?chunkName=DbModelPageRoutingModule"
  },
  {
    path: "main",
    loadChildren: "./_modules/pages/MainPageRoutingModule#MainPageRoutingModule?chunkName=MainPageRoutingModule"
  }
];