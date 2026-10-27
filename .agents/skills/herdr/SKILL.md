---
name: herdr
description: "Use when the user is running inside the herdr terminal app (binary at ~/.local/bin/herdr) and wants to parallelize work — split the pane, open a new tab/workspace, start another AI agent there, hand it a prompt, and read back what it did. Also covers general herdr CLI usage: sessions, worktrees, workspaces, notifications. Trigger on 'split the pane', 'run another agent alongside', 'spin up a sub-agent', 'open a new herdr tab/pane', or explicit mentions of herdr."
---

# herdr

`herdr` is a terminal workspace manager for AI coding agents (https://herdr.dev). It runs a
persistent local server; the `herdr` CLI talks to it over a Unix socket
(`~/.config/herdr/herdr.sock`) and returns JSON. Config at `~/.config/herdr/config.toml`, logs at
`~/.config/herdr/herdr-{server,client}.log`.

Binary: `/Users/megha/.local/bin/herdr` (also just `herdr` if on PATH).

If an AI coding agent is running inside a herdr pane, it can drive the *rest* of the herdr session
(other panes/tabs/workspaces) purely through this CLI — no GUI interaction needed. This is the
core use case: split the current pane, start a second agent in it, delegate a task, and read the
result back into the current conversation.

## Orientation

- `herdr status` — is the server up.
- `herdr pane current` — identifies the pane the CLI call itself was run from. Useful for an agent
  running inside herdr to figure out "which pane am I."
- `herdr pane list` / `herdr agent list` / `herdr workspace list` — full JSON snapshot of live
  panes, detected agents, and workspaces. `agent_status` per pane is one of `unknown`, `idle`,
  `working`, `blocked`, `done`.
- IDs are `<workspace>:<pane>`, e.g. `w7:p2`. Tabs are `<workspace>:<tab>`.

## Core workflow: split a pane and run another agent

1. **Split.**
   ```
   herdr pane split --current --direction right --no-focus
   ```
   `--direction` is `right` or `down`. `--no-focus` keeps focus on the current pane; use `--focus`
   when the user explicitly wants to watch the new pane. Returns the new `pane_id` in JSON.

2a. **For a plain shell command** (no interactive agent needed — linting, a build, a quick
   script):
   ```
   herdr pane run <pane_id> -- <command...>
   herdr pane read <pane_id> --source visible
   ```
   `pane run` is fire-and-forget: it types the command into the pane's shell and returns
   immediately with no stdout of its own. Follow up with `pane read` to see what happened.

   **Gotcha (confirmed by testing):** `pane read`'s default `--source recent` can come back
   completely empty right after a fresh `run`, even though the command executed. Use
   `--source visible` for a reliable one-shot snapshot of the pane's current screen contents.
   `--source recent-unwrapped` is the alternative if you need scrollback beyond the visible
   viewport.

2b. **For a real interactive coding agent** (Claude, Codex, Gemini, etc. working a sub-task):
   ```
   herdr agent start <name> --kind codex --pane <pane_id>
   ```
   The target pane must already be sitting at an interactive shell prompt. `--kind` is one of:
   `pi`, `claude`, `codex`, `gemini`, `cursor`, `devin`, `agy`, `cline`, `omp`, `mastracode`,
   `opencode`, `copilot`, `kimi`, `kiro`, `droid`, `amp`, `grok`, `hermes`, `kilo`, `qodercli`,
   `maki`. `--timeout <ms>` controls how long it waits for the agent to become ready.

   Start the agent and submit its prompt in separate CLI calls. Then hand it the task:
   ```
   herdr agent prompt <name-or-pane_id> "<task text>" --wait --until idle --timeout 120000
   ```
   `--wait` blocks until the agent reaches a terminal-ish state. Without `--wait`, it returns
   immediately after submitting, which is appropriate when the user wants to watch ongoing work.

   Read its output with `herdr pane read <pane_id> --source visible` or
   `herdr agent read <target>`.

   To poll separately instead of blocking on `prompt --wait`, use:
   ```
   herdr agent wait <target> --until idle --timeout 120000
   ```

3. **Clean up** ephemeral panes when the sub-task is done and its output has been captured:
   ```
   herdr pane close <pane_id>
   ```
   Skip this if the user wants to keep looking at it.

## Other useful subcommands

- `herdr tab create [--workspace <id>] [--cwd <path>] [--label <text>] [--focus|--no-focus]` — new
  tab instead of a pane split, for less tightly coupled parallel work.
- `herdr workspace create [--cwd <path>] [--label <text>]` — a whole new workspace.
- `herdr worktree create --branch <name> [--base <ref>] [--path <path>]` — create and open a git
  worktree as a workspace for isolated changes.
- `herdr session list` / `herdr session attach <name>` — named persistent sessions.
- `herdr pane send-text <pane_id> <text>` / `herdr pane send-keys <pane_id> <keys>` — lower-level
  input for a TUI that is not a plain shell.
- `herdr pane wait-output <pane_id> ...` — wait for a pattern in pane output.
- `herdr notification show ...` — surface a native notification from a script.
- `herdr api snapshot` — full live session dump.

Run `herdr <subcommand> --help` for exact flags because options may change between versions.

## Notes from live testing

- Read-only commands such as `pane list`, `pane get`, `agent list`, `workspace list`, and
  `pane current` are one-shot socket calls and also work from ordinary shell subprocesses.
- State-changing calls appear in `~/.config/herdr/herdr-server.log` as API requests tagged
  `changes_ui=true`; pure reads generally are not logged at INFO level.
