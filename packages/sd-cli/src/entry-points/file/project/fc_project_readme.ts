export const fc_project_readme = (opt: { description: string }): string => /* language=md */ `
# ${opt.description}

## Requirements

* node@16.x.x

## Installation

    npm install
`.trim();
