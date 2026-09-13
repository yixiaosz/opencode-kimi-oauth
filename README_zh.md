# opencode-kimi-oauth

[English](./README.md) | [简体中文](./README_zh.md)

通过 Kimi 官方的设备流 OAuth，在 [opencode](https://opencode.ai) 中使用 **Kimi For Coding**，与官方 `kimi-cli` 使用相同的协议。

> **仅支持 OAuth。** 如果你使用按量计费的 Kimi API 密钥，请改用 opencode 内置的 `kimi-for-coding`。

与常规的 OpenAI 兼容 Kimi 配置相比，本插件：

- 使用 Kimi 官方 OAuth 设备流登录，并将令牌存储在 opencode 中
- 发送 kimi-cli 的 `User-Agent` 和七个 `X-Msh-*` 指纹请求头（包括共用的 `~/.kimi/device_id`）
- 为 Kimi 编程模型添加 `prompt_cache_key` 和 `reasoning_effort`
- 通过 `/coding/v1/models` 发现你的账户实际使用的模型标识、上下文长度以及图像/视频支持情况

贡献者文档和参考资料位于 [`AGENTS.md`](./AGENTS.md)。

---

## 支持的模型

| 模型 ID | 模型 | 上下文 | 推理 | 多模态输入 | 可用范围 |
|---|---|---|---|---|---|
| `kimi-for-coding` | K2.8 Preview | 1M | `low` / `high` / `max`（默认 `max`） | 图像、视频 | 所有会员 |
| `k3` | K3 | 1M | `low` / `high` / `max`（默认 `high`） | 图像、视频 | Moderato 及以上；Allegretto 及以上支持 1M 上下文 |
| `k3-256k` | K3 | 256K | `low` / `high` / `max`（默认 `high`） | 图像 | Moderato 及以上 |
| `kimi-for-coding-highspeed` | K2.7 Code HighSpeed | 256K | 始终启用思考 | — | Allegretto 及以上 |

> 此表与 [Kimi 的 OAuth 模型配置](https://www.kimi.com/code/docs/en/kimi-code/models.html)一致（最后更新于 2026 年 9 月）。

---

## 快速开始

**要求：** opencode >= 1.4.6，并已开通月费或年费的 Kimi 会员订阅。

### 1. 安装插件

```sh
opencode plugin opencode-kimi-oauth --global
```

如果要使用本地软件包安装：

```sh
opencode plugin /absolute/path/to/opencode-kimi-oauth --global
```

> **重要：** `opencode plugin` 只会在配置中添加 `"plugin"` 行。它**不会**添加 `"provider"` 条目，也不会提示你这一点。如果缺少 `"provider"` 条目，模型就不会出现在 opencode 中。

### 2. 登录

```sh
opencode auth login -p kimi-for-coding-oauth
```

在浏览器中批准你的 Kimi 账户登录。

### 3. 添加 Provider 条目

登录后，插件会输出一段可直接粘贴的 JSON 配置。将其中的 `provider` 键合并到 `~/.config/opencode/opencode.jsonc`，并保留已有的 `plugin` 键：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-kimi-oauth"],
  "provider": {
    // 在此粘贴输出的 provider 配置块
  }
}
```

<details>
<summary>完整配置示例</summary>

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

### 4. 使用

在 opencode 中选择以下任一模型：

- `kimi-for-coding-oauth/kimi-for-coding` — K2.8 Preview
- `kimi-for-coding-oauth/k3` — 上下文长度为 1M 的 K3
- `kimi-for-coding-oauth/k3-256k` — 上下文长度为 256K 的 K3
- `kimi-for-coding-oauth/kimi-for-coding-highspeed` — K2.7 Code HighSpeed

## 变体切换

opencode 默认的变体切换快捷键是 **Ctrl+T**：

- `off` — 禁用思考
- `auto` — 由服务器选择模型默认值
- `low` / `medium` / `high` / `max` — 请求使用相应的推理强度

Kimi 编程后端接受 `low` / `high` / `max`；opencode 的 `xhigh` 会映射为 `max`。`kimi-for-coding-highspeed` 没有变体。每个请求还会将 `prompt_cache_key` 设置为 opencode 的会话 ID，以便后续轮次复用 Kimi 的提示词缓存。

## 用量命令

在 opencode 中输入 TUI 命令 `/kimi:usage` 会显示你的 Kimi 订阅用量（每周和每 5 小时限额）。

## 故障排除

<details>
<summary><strong>Unknown provider "kimi-for-coding-oauth"</strong></summary>

opencode 未能加载插件，因此 OAuth 流程没有启动。常见原因包括：

- 你跳过了 `opencode plugin opencode-kimi-oauth --global`
- 你编辑了本地检出的代码，但 opencode 并未指向该检出路径
- 插件配置位于项目本地的 `.opencode/opencode.jsonc` 中，但你在另一个目录运行了 `opencode auth login`

解决方法：使用 `opencode plugin opencode-kimi-oauth --global` 进行全局安装，确认配置中存在 `plugin` 条目，然后再次运行 `opencode auth login -p kimi-for-coding-oauth`。

</details>

<details>
<summary><strong>Config file is not valid JSON</strong></summary>

`~/.config/opencode/opencode.jsonc` 只能包含**一个**顶层 `{ ... }` 对象。出现此错误意味着 `provider` 配置块被作为第二个对象粘贴到了 `plugin` 配置块之后。

解决方法：将它们合并为一个对象，`plugin` 和 `provider` 应为同级键：

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

opencode 根据模型元数据决定是否允许图像输入。配置中的模型条目必须包含 `"attachment": true` 和 `"modalities"`。请更新配置块，使其与上方的[完整配置示例](#快速开始)一致。插件也会在运行时通过 `/coding/v1/models` 回填这些能力，但首次请求所用的静态配置必须正确。

</details>

## 参考资料

- 请求字段、请求头、涉及的文件和架构：请参阅 [`AGENTS.md`](./AGENTS.md)。
- 状态文件：`~/.kimi/device_id`（与 kimi-cli 共用的 UUID）以及 opencode 的认证存储。凭据绝不会写入 `~/.kimi/credentials/`，该路径属于 kimi-cli。

## 致谢

本项目 fork 自 lemon07r 的 [opencode-kimi-full](https://github.com/lemon07r/opencode-kimi-full)。原项目已停止维护，且附带的配置已经过时。

## 许可证

MIT。
