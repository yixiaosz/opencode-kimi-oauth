# opencode-kimi-oauth

[English](./README.md) | [简体中文](./README_zh.md)

Use **Kimi For Coding** in [opencode](https://opencode.ai) through Kimi's official device-flow OAuth, the same way the official `kimi-cli` does.

> **OAuth only.** If you have a Kimi API key, use opencode's built-in `kimi-for-coding` provider instead.

Compared with a stock OpenAI-compatible Kimi setup, this plugin:

- logs in with the official Kimi OAuth device flow and stores tokens in opencode's auth store
- sends kimi-cli's `User-Agent` and seven `X-Msh-*` fingerprint headers (including the shared `~/.kimi/device_id`)
- adds `prompt_cache_key` and `reasoning_effort` for Kimi coding models
- discovers your account's real model slug, context length, and image/video support from `/coding/v1/models`

Contributor and reference documentation lives in [`AGENTS.md`](./AGENTS.md).

---

## Supported models

| Model id | Model | Context | Reasoning | Multimodal input | Availability |
|---|---|---|---|---|---|
| `kimi-for-coding` | K2.8 Preview | 1M | `low` / `high` / `max` (default `max`) | image, video | All members |
| `k3` | K3 | 1M | `low` / `high` / `max` (default `high`) | image, video | Moderato+; 1M context at Allegretto+ |
| `k3-256k` | K3 | 256K | `low` / `high` / `max` (default `high`) | image | Moderato+ |
| `kimi-for-coding-highspeed` | K2.7 Code HighSpeed | 256K | always thinking | — | Allegretto+ |

> This table matches [Kimi's OAuth model configuration](https://www.kimi.com/code/docs/en/kimi-code/models.html) (last updated 9/2026).

---

## Quick start

**Requirements:** opencode >= 1.4.6 and an active Kimi For Coding subscription.

### 1. Install the plugin

```sh
opencode plugin opencode-kimi-oauth --global
```

For a local checkout instead of the published package:

```sh
opencode plugin /absolute/path/to/opencode-kimi-oauth --global
```

> **Important:** `opencode plugin` only adds the `"plugin"` line to your config. It does **not** add the provider entry, and it won't tell you. Without the provider entry, the model never appears in opencode.

### 2. Log in

```sh
opencode auth login -p kimi-for-coding-oauth
```

Approve your Kimi account login in your browser.

### 3. Add the provider entry

On login, the plugin prints a ready-to-paste JSON block. Merge its `provider` key into `~/.config/opencode/opencode.jsonc`, keeping the existing `plugin` key:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-kimi-oauth"],
  "provider": {
    // paste the printed provider block here
  }
}
```

<details>
<summary>Full config example</summary>

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-kimi-oauth"],
  "provider": {
    "kimi-for-coding-oauth": {
      "name": "Kimi For Coding (OAuth)",
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "https://api.kimi.com/coding/v1"
      },
      "models": {
        "kimi-for-coding": {
          "name": "Kimi For Coding",
          "attachment": true,
          "reasoning": true,
          "modalities": {
            "input": ["text", "image"],
            "output": ["text"]
          },
          "options": {},
          "variants": {
            "off":    { "reasoning_effort": "off" },
            "auto":   { "reasoning_effort": "auto" },
            "low":    { "reasoning_effort": "low" },
            "medium": { "reasoning_effort": "medium" },
            "high":   { "reasoning_effort": "high" },
            "max":    { "reasoning_effort": "max" }
          }
        },
        "k3": {
          "name": "K3",
          "attachment": true,
          "reasoning": true,
          "modalities": {
            "input": ["text", "image", "video"],
            "output": ["text"]
          },
          "options": {},
          "variants": {
            "off":  { "reasoning_effort": "off" },
            "auto": { "reasoning_effort": "auto" },
            "low":  { "reasoning_effort": "low" },
            "high": { "reasoning_effort": "high" },
            "max":  { "reasoning_effort": "max" }
          }
        },
        "k3-256k": {
          "name": "K3-256k",
          "attachment": true,
          "reasoning": true,
          "modalities": {
            "input": ["text", "image"],
            "output": ["text"]
          },
          "options": {},
          "variants": {
            "off":  { "reasoning_effort": "off" },
            "auto": { "reasoning_effort": "auto" },
            "low":  { "reasoning_effort": "low" },
            "high": { "reasoning_effort": "high" },
            "max":  { "reasoning_effort": "max" }
          }
        },
        "kimi-for-coding-highspeed": {
          "name": "Kimi For Coding HighSpeed",
          "attachment": true,
          "reasoning": true,
          "modalities": {
            "input": ["text", "image", "video"],
            "output": ["text"]
          },
          "options": {}
        }
      }
    }
  }
}
```

</details>

### 4. Use it

Select one of these in opencode:

- `kimi-for-coding-oauth/kimi-for-coding` — K2.8 Preview
- `kimi-for-coding-oauth/k3` — K3 with 1M context
- `kimi-for-coding-oauth/k3-256k` — K3 with 256K context
- `kimi-for-coding-oauth/kimi-for-coding-highspeed` — K2.7 Code HighSpeed

## Variant cycle

opencode's default variant-cycle keybind is **Ctrl+T**:

- `off` — disables thinking
- `auto` — lets the server choose the model default
- `low` / `medium` / `high` / `max` — asks for that reasoning effort

Kimi's coding backend accepts `low` / `high` / `max`; opencode's `xhigh` maps to `max`. `kimi-for-coding-highspeed` has no variants. Every request also sets `prompt_cache_key` to opencode's session id so follow-up turns can reuse Kimi's prompt cache.

## Usage command

The `/kimi:usage` TUI command shows your Kimi Code subscription usage (weekly and 5-hour limits).

## Troubleshooting

<details>
<summary><strong>Unknown provider "kimi-for-coding-oauth"</strong></summary>

opencode did not load the plugin, so the OAuth flow never started. This is usually because:

- you skipped `opencode plugin opencode-kimi-oauth --global`
- you edited a local checkout but opencode isn't pointed at that checkout path
- the plugin is in a project-local `.opencode/opencode.jsonc` but you ran `opencode auth login` from another directory

Fix: install globally with `opencode plugin opencode-kimi-oauth --global`, confirm the `plugin` entry is in your config, then run `opencode auth login -p kimi-for-coding-oauth` again.

</details>

<details>
<summary><strong>Config file is not valid JSON</strong></summary>

`~/.config/opencode/opencode.jsonc` can only have **one** top-level `{ ... }` object. This error means the provider block was pasted as a second object after the `plugin` block.

Fix: merge them into one object — `plugin` and `provider` are sibling keys:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-kimi-oauth"],
  "provider": { /* ... */ }
}
```

</details>

<details>
<summary><strong>Images not working / "this model does not support image input"</strong></summary>

opencode gates image input on model metadata. Your config's model entries must include `"attachment": true` and `"modalities"`. Update your config block to match the [full config example](#quick-start) above. The plugin also backfills these capabilities at runtime from `/coding/v1/models`, but the static config must be correct for the first request.

</details>

## Reference

- Request fields, headers, files touched, and architecture: see [`AGENTS.md`](./AGENTS.md).
- State: `~/.kimi/device_id` (a UUID shared with kimi-cli) and opencode's auth store. Credentials are never written to `~/.kimi/credentials/` — that path belongs to kimi-cli.

## Credits

Forked from [opencode-kimi-full](https://github.com/lemon07r/opencode-kimi-full) by lemon07r. The original is no longer maintained and ships outdated config.

## License

MIT.
