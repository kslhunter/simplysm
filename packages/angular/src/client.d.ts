// sd-cli(esbuild) 클라이언트 빌드가 지원하는 비-JS 모듈의 타입 선언.
// vite/client 대응물 — 소비처는 src/sd-env.d.ts 에서
// `/// <reference types="@simplysm/angular/client" />` 로 이 선언들을 끌어온다.

// 스타일 (side-effect import)
declare module "*.scss" {}
declare module "*.css" {}

// 스타일 (inline 문자열)
declare module "*.scss?inline" {
  const content: string;
  export default content;
}

// 자산 (esbuild file loader → URL 문자열)
declare module "*.woff" {
  const url: string;
  export default url;
}
declare module "*.woff2" {
  const url: string;
  export default url;
}
declare module "*.ttf" {
  const url: string;
  export default url;
}
declare module "*.eot" {
  const url: string;
  export default url;
}
declare module "*.otf" {
  const url: string;
  export default url;
}
declare module "*.svg" {
  const url: string;
  export default url;
}
declare module "*.png" {
  const url: string;
  export default url;
}
declare module "*.jpg" {
  const url: string;
  export default url;
}
declare module "*.jpeg" {
  const url: string;
  export default url;
}
declare module "*.gif" {
  const url: string;
  export default url;
}
declare module "*.webp" {
  const url: string;
  export default url;
}
declare module "*.ico" {
  const url: string;
  export default url;
}
