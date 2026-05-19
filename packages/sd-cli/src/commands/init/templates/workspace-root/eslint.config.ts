import type { Linter } from "eslint";
import simplysmRecommended from "@simplysm/lint/eslint-recommended";

export default [...simplysmRecommended] as Linter.Config[];
