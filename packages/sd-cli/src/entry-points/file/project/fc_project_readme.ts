export const fc_project_readme = (opt: { description: string }): string => /* language=md */ `
# ${opt.description}

## Requirements

* node v16.x.x

## Installation

    npm install
    
`.trim();
