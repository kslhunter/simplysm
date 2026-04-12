/**
 * HMR 클라이언트 스크립트를 생성한다.
 * Chrome 61+ 호환 문법으로 작성 (optional chaining, nullish coalescing 미사용).
 * @param basePath basePath (예: "/app/")
 */
export function getHmrClientScript(_basePath: string): string {
  return [
    "(function() {",
    "  var ws = null;",
    "  var reconnectDelay = 1000;",
    "",
    "  function connect() {",
    '    ws = new WebSocket("ws://" + location.hostname + ":" + location.port);',
    "",
    "    ws.onmessage = function(e) {",
    "      var msg = JSON.parse(e.data);",
    "",
    '      if (msg.type === "component-update") {',
    '        if (typeof globalThis.__hmr_dispatch === "function") {',
    "          var ids = msg.ids;",
    "          for (var i = 0; i < ids.length; i++) {",
    '            globalThis.__hmr_dispatch("angular:component-update", {',
    "              id: ids[i],",
    "              timestamp: msg.timestamp",
    "            });",
    "          }",
    "        }",
    "",
    '      } else if (msg.type === "css-update") {',
    '        var links = document.querySelectorAll(\'link[rel="stylesheet"]\');',
    "        var files = msg.files;",
    "        for (var j = 0; j < links.length; j++) {",
    '          var href = links[j].getAttribute("href");',
    "          if (href) {",
    '            var base = href.split("?")[0];',
    '            var fileName = base.substring(base.lastIndexOf("/") + 1);',
    "            if (files && files.indexOf(fileName) !== -1) {",
    '              links[j].setAttribute("href", base + "?t=" + msg.timestamp);',
    "            }",
    "          }",
    "        }",
    "",
    '      } else if (msg.type === "full-reload") {',
    "        location.reload();",
    "      }",
    "    };",
    "",
    "    ws.onclose = function() {",
    "      setTimeout(connect, reconnectDelay);",
    "    };",
    "  }",
    "",
    "  connect();",
    "})();",
  ].join("\n");
}

/**
 * index.html에 HMR 클라이언트 스크립트를 주입하는 postTransform을 생성한다.
 * Feature 1.2의 GenerateIndexHtmlOptions.postTransform에 전달하여 사용.
 * @param basePath basePath (예: "/app/")
 */
export function createHmrPostTransform(basePath: string): (content: string) => Promise<string> {
  const script = getHmrClientScript(basePath);
  const scriptTag = `<script>${script}</script>`;

  return (html: string): Promise<string> => {
    const bodyCloseIdx = html.lastIndexOf("</body>");
    if (bodyCloseIdx !== -1) {
      return Promise.resolve(html.slice(0, bodyCloseIdx) + scriptTag + html.slice(bodyCloseIdx));
    }
    return Promise.resolve(html + scriptTag);
  };
}
