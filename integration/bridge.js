// Codebun's page-side bootstrap, injected by vshell with `--script`.
//
// The shell hands the page an opaque payload (window.vshell.host) and forwards
// the native menu commands it does not handle itself. This file is what gives
// both of them meaning for this application: it republishes the payload on a
// same-origin BroadcastChannel, which is how the extension host worker — a
// worker with no `window` — learns the session token and the folder to open.
//
// Why a BroadcastChannel and not an HTTP response: the token has to reach the
// worker without ever appearing in something another local process could fetch.
// A document-start user script cannot be observed by anyone but the page, and a
// BroadcastChannel is origin scoped. See server/backend.js for what the token
// then gates.
//
// The extension re-sends `codebun:hello` every 250 ms until it gets an answer,
// because either side may start late. That is why the folder dialog is guarded
// per request id: without it, every retry while the (modal!) dialog is open
// would queue another dialog.
(function () {
  if (window.__codebunBootstrap) return
  var host = (window.vshell && window.vshell.host) || {}
  var boot = { token: host.token || '', folder: host.folder || '' }
  window.__codebunBootstrap = boot

  var picking = {}
  try {
    var bc = new BroadcastChannel('codebun-bootstrap')
    var announce = function () {
      bc.postMessage({ type: 'codebun:bootstrap', token: boot.token, folder: boot.folder })
    }

    bc.onmessage = function (ev) {
      var d = ev && ev.data
      if (!d || typeof d.type !== 'string') return
      if (d.type === 'codebun:hello') {
        announce()
        return
      }
      if (d.type === 'codebun:pickFolder') {
        if (picking[d.id]) return
        picking[d.id] = true
        window.vshell.dialog.openFolder().then(function (folder) {
          delete picking[d.id]
          bc.postMessage({ type: 'codebun:folderPicked', id: d.id, folder: folder || '' })
        })
        return
      }
    }

    // Native menu -> workbench. The shell owns the bar and emits `menu` for every
    // command that is not its own; the extension maps the command to a VS Code
    // command, so the vocabulary of the menu is this side's business.
    if (window.vshell && window.vshell.on) {
      window.vshell.on('menu', function (command) {
        try {
          bc.postMessage({ type: 'codebun:menu', command: String(command) })
        } catch (err) {}
      })
    }

    announce()
  } catch (err) {}
})()
