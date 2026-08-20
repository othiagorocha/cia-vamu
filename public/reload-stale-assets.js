(function () {
  var KEY = "cia-vamu:stale-asset-reload";
  var COOLDOWN_MS = 10000;

  function isStaleAsset(url) {
    return typeof url === "string" && url.indexOf("/_next/static/") !== -1;
  }

  function reloadOnce() {
    try {
      var last = Number(sessionStorage.getItem(KEY) || 0);
      if (Date.now() - last < COOLDOWN_MS) return;
      sessionStorage.setItem(KEY, String(Date.now()));
    } catch (e) {}
    window.location.reload();
  }

  window.addEventListener(
    "error",
    function (event) {
      var el = event.target;
      if (!el) return;
      if (el.tagName === "SCRIPT" && isStaleAsset(el.src)) reloadOnce();
      if (el.tagName === "LINK" && isStaleAsset(el.href)) reloadOnce();
    },
    true,
  );

  window.addEventListener("unhandledrejection", function (event) {
    var reason = event.reason;
    var message = String(
      reason && reason.message ? reason.message : reason || "",
    );
    var name = reason && reason.name ? reason.name : "";
    if (name === "ChunkLoadError" || message.indexOf("Loading chunk") !== -1) {
      reloadOnce();
    }
  });
})();
