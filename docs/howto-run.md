# Running codebun

```sh
bin/codebun                      # serve the static web build in web/public
bin/codebun --open-folder        # ... and ask for a folder with the native dialog
bin/codebun --folder C:/src/app  # ... or open one directly
bin/codebun --reh                # start the REH as a child and front it
```

`bin/codebun.cmd` is the same launcher for cmd.exe (it just finds `sh` and hands
over). Anything the launcher does not recognise goes straight to the shell:
`bin/codebun -- --devtools`.

## What it does

Everything VS Code-shaped lives on this side. The launcher drives **vshell** — an
Electron alternative that owns a window, an engine, an HTTP/WS origin and the
lifetime of the processes it starts — and passes it only data:

| flag | what codebun puts in it |
|---|---|
| `--inject` | `{"token": "<random per run>"}` — opaque to the shell |
| `--script` | `integration/bridge.js` — republishes that payload on a BroadcastChannel |
| `--menu` | `integration/menu.json` — the native bar in VS Code's vocabulary |
| `--backend` | `server/backend.js` — FS provider, PTY terminal, rendered host page |
| `--serve` / `--proxy` / `--run` | which workbench to show, and whether to start it |

The shell has no idea what a token, a folder or a menu command means. Adding
another application on top of it costs no V code.

## The two modes

**Static web build (default)** — `stage/build_web.sh` produces `web/public` (the
workbench bundle plus the built-in extensions, including `codebun-backend`). The
web extension host runs in a worker, so a browser extension is a first-class
citizen: the file system provider, the terminal and the menu mapping all work.
This is the flow to use while iterating on the workbench itself.

**REH (`--reh`)** — `stage/build_reh.sh` produces `.work/reh`; the launcher starts
`bun .work/reh/out/server-main.js` as a child of the shell (`--run`), which puts it
inside the shell's **job object**: closing — or killing — the window takes the
server, its extension host, its pty host and its file watchers with it.

The shell is also the *origin* in this mode (`--proxy`), because it terminates the
WebSocket and pipes frames: measured, WebKit's `WebSocket` against the REH's own
server (VS Code's `ws` on `node:http`, under Bun) completes the handshake, receives
a valid `101`, and then never fires `open`. WebKit ↔ `Bun.serve` works, and Bun as a
*client* of the REH works, so the proxy is the seam that sidesteps it.

## Requirements

| | |
|---|---|
| a shell | `sh ../vshell/scripts/build_vshell.sh`, or `VSHELL_BIN=/path/to/vshell.exe` (the launcher also looks in `./vshell/bin/`) |
| `bun` | on `PATH`, or in `~/.bun/bin` |
| `web/public` **or** `.work/reh` | depends on the mode; the launcher says which build is missing |

## Troubleshooting

| symptom | cause |
|---|---|
| `missing or invalid backend token` (401) | the page never received the payload: check `--inject`/`--script` reached the shell, and `window.__codebunBootstrap` with `--eval` |
| the window is blank, no error | the engine runtime is incomplete (`sh ../vshell/scripts/build_vshell.sh` prints `runtime OK/MISSING`); or the workbench is in the startup reload loop described in `vshell/docs/ARCHITECTURE.md` §3.2 |
| a rebuild looks like it did nothing | `/static` is served with a one-year max-age and no validator: use `--no-cache` **and** a different `--port` |
| `EADDRINUSE` | a previous run survived; the shell's job object normally prevents it, so check with `Get-Process vshell,bun` |
