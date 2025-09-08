import { Project } from "ts-morph";

export default function getTsMortphSourceFiles() {
  const project = new Project({
    tsConfigFilePath: "tsconfig.base.json",
  });

  return project.getSourceFiles("packages/*/src/**/*.ts");
}
