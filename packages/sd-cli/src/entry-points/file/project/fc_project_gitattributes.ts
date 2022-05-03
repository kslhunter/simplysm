export const fc_project_gitattributes = (): string => /* language=gitattributes */ `

*.sql filter=lfs diff=lfs merge=lfs -text

`.trim();
