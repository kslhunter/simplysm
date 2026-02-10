function buildHref(path) {
  const hash = window.location.hash;
  const isHashRouter = hash === "#/" || hash.startsWith("#/");
  if (isHashRouter) {
    const baseUrl = window.location.origin + window.location.pathname + window.location.search;
    return `${baseUrl}#${path}`;
  }
  return new URL(path, window.location.origin).href;
}
export { buildHref };
//# sourceMappingURL=build-href.js.map
