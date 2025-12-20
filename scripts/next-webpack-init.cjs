try {
  const webpackModule = require("next/dist/compiled/webpack/webpack");
  if (webpackModule && typeof webpackModule.init === "function") {
    webpackModule.init();
  }

  const resolved =
    webpackModule?.webpack ??
    (typeof webpackModule === "function" ? webpackModule : null) ??
    (webpackModule?.default ?? null);

  if (resolved && typeof resolved.WebpackError === "function") {
    if (!webpackModule.WebpackError) {
      webpackModule.WebpackError = resolved.WebpackError;
    }
    if (!webpackModule.webpack) {
      webpackModule.webpack = resolved;
    }
  }
} catch {
  // noop: this runs before Next's build kicks off; if webpack isn't available yet,
  // we let Next handle it the usual way.
}
