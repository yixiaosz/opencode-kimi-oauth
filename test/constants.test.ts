import { test, expect } from "bun:test"
import * as C from "../src/constants.ts"

// These values form the "identity" of the plugin on the wire. Typos silently
// send requests down the wrong auth / backend path or collide with models.dev
// (PROVIDER_ID). See AGENTS.md "Contracts to keep intact".

test("KIMI_CLI_VERSION is a non-empty semver", () => {
  expect(C.KIMI_CLI_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
})

test("USER_AGENT embeds KIMI_CLI_VERSION", () => {
  // Must be `KimiCLI/<version>` verbatim — Moonshot's backend 403s on any
  // other UA prefix ("access_terminated_error"). See upstream
  // research/kimi-cli/src/kimi_cli/constant.py → get_user_agent.
  expect(C.USER_AGENT).toBe(`KimiCLI/${C.KIMI_CLI_VERSION}`)
})

test("OAuth constants match upstream kimi-cli exactly", () => {
  // Pinned values from research/kimi-cli/src/kimi_cli/auth/oauth.py. If these
  // drift from upstream, tokens are issued against the wrong client and the
  // plugin no longer mirrors official kimi-cli auth.
  expect(C.OAUTH_HOST).toBe("https://auth.kimi.com")
  expect(C.OAUTH_DEVICE_AUTH_URL).toBe("https://auth.kimi.com/api/oauth/device_authorization")
  expect(C.OAUTH_TOKEN_URL).toBe("https://auth.kimi.com/api/oauth/token")
  expect(C.OAUTH_CLIENT_ID).toBe("17e5f671-d194-4dfb-9706-5516cb48c098")
  expect(C.OAUTH_DEVICE_GRANT).toBe("urn:ietf:params:oauth:grant-type:device_code")
  expect(C.OAUTH_REFRESH_GRANT).toBe("refresh_token")
})

test("PROVIDER_ID does not collide with models.dev (AGENTS.md rule 8)", () => {
  expect(C.PROVIDER_ID).toBe("kimi-for-coding-oauth")
  expect(C.PROVIDER_ID).not.toBe("kimi-for-coding")
})

test("MODEL_ID goes over the wire verbatim (AGENTS.md rule 6)", () => {
  expect(C.MODEL_ID).toBe("kimi-for-coding")
})

test("K3.1 Pro model ids are registered in the Kimi allowlist", () => {
  expect(C.K3_1_PRO_MODEL_ID).toBe("k3.1-pro")
  expect(C.K3_1_PRO_HIGHSPEED_MODEL_ID).toBe("k3.1-pro-highspeed")
  expect(C.KIMI_MODEL_IDS.has(C.K3_1_PRO_MODEL_ID)).toBe(true)
  expect(C.KIMI_MODEL_IDS.has(C.K3_1_PRO_HIGHSPEED_MODEL_ID)).toBe(true)
  expect(C.KIMI_MODEL_IDS.has(C.K3_MODEL_ID)).toBe(true)
  expect(C.KIMI_MODEL_IDS.has(C.K3_256K_MODEL_ID)).toBe(true)
  expect(C.KIMI_MODEL_IDS.has(C.HIGHSPEED_MODEL_ID)).toBe(true)
})

test("K3.1 Pro models are marked thinking-required", () => {
  expect([...C.THINKING_REQUIRED_MODEL_IDS].sort()).toEqual([
    C.K3_1_PRO_HIGHSPEED_MODEL_ID,
    C.K3_1_PRO_MODEL_ID,
  ].sort())
  expect(C.THINKING_REQUIRED_MODEL_IDS.has(C.K3_MODEL_ID)).toBe(false)
  expect(C.THINKING_REQUIRED_MODEL_IDS.has(C.MODEL_ID)).toBe(false)
})

test("REFRESH_SAFETY_WINDOW_MS is positive and well below token TTL", () => {
  // Token TTLs are ~15 min; anything bigger would mean we refresh on every call.
  expect(C.REFRESH_SAFETY_WINDOW_MS).toBeGreaterThan(0)
  expect(C.REFRESH_SAFETY_WINDOW_MS).toBeLessThan(5 * 60_000)
})
