export const routes = [
  {
    path: "config",
    loadChildren: "./_modules/pages/ConfigPageRoutingModule#ConfigPageRoutingModule?chunkName=ConfigPageRoutingModule"
  },
  {
    path: "db-model",
    loadChildren: "./_modules/pages/DbModelPageRoutingModule#DbModelPageRoutingModule?chunkName=DbModelPageRoutingModule"
  },
  {
    path: "main",
    loadChildren: "./_modules/pages/MainPageRoutingModule#MainPageRoutingModule?chunkName=MainPageRoutingModule"
  }
];