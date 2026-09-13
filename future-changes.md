# future-changes.md — postponed work

This file tracks investigations and proposed plans that were validated but **postponed**
because the current behavior still works. When picking any of these back up, read the
linked source and re-verify against the current `kimi-code` before executing.

---

## P1: Migrate the request fingerprint from kimi-cli to kimi-code

**Status:** Postponed — the current kimi-cli fingerprint still works against
`api.kimi.com/coding/v1`. Migrating is a future improvement, not a bug fix.

### Why

`kimi-cli` is deprecated by Moonshot; the current official client is `kimi-code`.
The plugin's core rule is "mirror the official client exactly" (AGENTS.md), and we
still mirror the *deprecated* kimi-cli fingerprint. Mirroring kimi-code keeps us
aligned with the live official client.

### Verified fingerprint of kimi-code (v0.42.0, installed locally)

Source: `~/.kimi-code/bin/kimi` (0.42.0). Header set is built by
`createKimiDefaultHeaders()` (UA + six `X-Msh-*`), attached to the OAuth device flow
and the `/models` provisioning call.

| Header | kimi-code value | Source |
|---|---|---|
| `User-Agent` | `kimi-code-cli/0.42.0` | `CLI_USER_AGENT_PRODUCT` / `getVersion()` |
| `X-Msh-Platform` | `kimi_code_cli` | `KIMI_CODE_PLATFORM` |
| `X-Msh-Version` | `0.42.0` | `KIMI_BUILD_INFO.version` |
| `X-Msh-Device-Name` | `os.hostname()` | ASCII-sanitized |
| `X-Msh-Device-Model` | `deviceModel()` | Darwin → `macOS <sw_vers> <arch>`; Windows → `Windows <os.release> <arch>`; else `<os.type> <os.release> <os.arch>` |
| `X-Msh-Os-Version` | `os.release()` | ASCII-sanitized |
| `X-Msh-Device-Id` | dashed UUID | `~/.kimi-code/device_id` (or `$KIMI_CODE_HOME`), file 0600, dir 0700 |

Also confirmed in 0.42.0:

- OAuth device flow at `auth.kimi.com/api/oauth/device_authorization` with the **same**
  `client_id` we already pin (`17e5f671-d194-4dfb-9706-5516cb48c098`).
- Model discovery: `GET {baseUrl}/models` with `Authorization: Bearer <token>` plus
  identity headers, parsing `id`, `context_length`, `display_name`, `supports_image_in`,
  `supports_video_in` (matches our `/coding/v1/models` usage).
- Usages: `GET {baseUrl}/usages` (matches our `src/usage.ts`).
- `prompt_cache_key` is sent via a cache-key hook (`{ prompt_cache_key: key }`).

### Diff vs. what we currently send (kimi-cli)

| Aspect | kimi-cli (current) | kimi-code (target) |
|---|---|---|
| `User-Agent` | `KimiCLI/1.41.0` | `kimi-code-cli/0.42.0` |
| `X-Msh-Platform` | `kimi_cli` | `kimi_code_cli` |
| `X-Msh-Version` | `1.41.0` (pinned) | `0.42.0` |
| Device-Model | `os.machine()` (`x86_64`), Windows `10`/`11` label | `os.arch()` (`x64`), Windows raw `os.release` |
| `X-Msh-Os-Version` | `os.version()` (kernel build string) | `os.release()` |
| Device-Id | `~/.kimi/device_id`, 32-char no-dash UUID | `~/.kimi-code/device_id`, 36-char dashed UUID |

### Agreed decisions

1. **Version:** pin `KIMI_CODE_VERSION = "0.42.0"` (rename of `KIMI_CLI_VERSION`); bump
   manually on kimi-code releases. No runtime detection from the user's install.
2. **Device id:** adopt `~/.kimi-code/device_id` (honor `$KIMI_CODE_HOME`), dashed UUID,
   reusing kimi-code's existing file when present. No legacy `~/.kimi` fallback.
3. **Chat-header scope:** keep sending all 7 fingerprint headers on every upstream call
   (chat + models + usages), as today — proven-accepted superset, just with new values.

### Proposed implementation (when picked up)

1. `src/constants.ts` — `KIMI_CLI_VERSION` → `KIMI_CODE_VERSION = "0.42.0"`;
   `USER_AGENT` → `` `kimi-code-cli/${KIMI_CODE_VERSION}` ``; add
   `KIMI_CODE_PLATFORM = "kimi_code_cli"`; update comments (drop `research/kimi-cli` refs).
2. `src/headers.ts` — device-id dir → `~/.kimi-code` (`$KIMI_CODE_HOME`), dashed UUID
   (remove `.replace(/-/g, "")`); `kimiDeviceModel()` → `os.arch()` and raw `os.release`
   for Windows (drop 10/11 label); `kimiHeaders()` → `kimi_code_cli`, `KIMI_CODE_VERSION`,
   `X-Msh-Os-Version` = `os.release()`.
3. `test/headers.test.ts` + `test/plugin.test.ts` — update expected platform, UA,
   os-version source, device-id path/format, device-model arch.
4. `AGENTS.md` — rewrite contract #1 (mirror kimi-code fingerprint, note kimi-cli
   deprecated; keep the off-spec → 403 caution re-anchored to kimi-code) and contract #2
   (device id shared with kimi-code at `~/.kimi-code/device_id`).
5. `README.md` + `README_zh.md` — bullets 3 & 4: "same fingerprint as **kimi-code**",
   "reuses `~/.kimi-code/device_id`".

### Mandatory live-verification gate (before any publish)

The old contract #1 claimed the backend 403s on off-spec UA. kimi-code is the official
client and works, so the backend accepts `kimi-code-cli/*`, but confirm anyway:

1. `opencode auth login kimi-for-coding-oauth` (device flow with new headers).
2. One-turn chat — no `access_terminated_error` 403.
3. `/models` discovery returns the wire slug.

If any step 403s, **revert to the kimi-cli fingerprint** as the proven fallback.

---

## Out of scope / observations (not planned changes)

- **Effort/body shape:** kimi-code 0.42.0's managed provider sends
  `extra_body.thinking { type, effort }` on its OpenAI-protocol path, while the
  third-party docs contract (`https://www.kimi.com/code/docs/en/kimi-code/models.html`)
  specifies `reasoning_effort`. Our commit "Align effort mapping with K2.8/K3 and add
  HighSpeed model" already follows the docs contract — leave as-is. Re-evaluate only if
  the docs change or the backend starts rejecting `reasoning_effort`.

## Repro / reference for re-investigation

- Local kimi-code binary: `~/.kimi-code/bin/kimi` (0.42.0). Its version is baked into
  `KIMI_BUILD_INFO` in `src/cli/build-info.ts` of the kimi-code source.
- Header builders live in kimi-code's identity/oauth packages:
  `createKimiDefaultHeaders`, `createKimiDeviceHeaders`, `createKimiUserAgent`,
  `deviceModel`, `createKimiDeviceId`, `defaultKimiHome`.
- Model discovery: `fetchManagedKimiCodeModels` → `GET {baseUrl}/models`.
- Re-verify against the installed binary with a fresh `--version` check before trusting
  the pinned version in this document.
