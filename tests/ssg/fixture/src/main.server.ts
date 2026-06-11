import { bootstrapApplication, type BootstrapContext } from "@angular/platform-browser";
import { provideServerRendering } from "@angular/platform-server";
import { AppRoot, appProviders } from "./app";

const bootstrap = (context: BootstrapContext) =>
  bootstrapApplication(
    AppRoot,
    {
      providers: [...appProviders, provideServerRendering()],
    },
    context,
  );

export default bootstrap;
