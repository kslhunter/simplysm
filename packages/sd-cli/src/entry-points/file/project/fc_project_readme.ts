export const fc_project_readme = (opt: { description: string }): string => /* language=md */ `
# ${opt.description}

## Requirements

* node v18.x.x

## Installation

    yarn install
    
`.trim();
