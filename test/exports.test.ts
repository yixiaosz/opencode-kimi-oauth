import { test, expect } from "bun:test"
import fs from "node:fs"
import type { TuiCommand, TuiPluginApi, TuiPluginMeta } from "@opencode-ai/plugin/tui"
import * as mod from "../src/index.ts"
import * as tuiMod from "../src/tui.ts"

// Regression guard for the 1.0.0 bug + the Windows loading fix:
// opencode's plugin loader first tries readV1Plugin (detect mode) on the
// default export. If it finds { id?, server } it uses the v1 path and
// never touches getLegacyPlugins. The legacy path iterates every export and
// throws "Plugin export is not a function" on any non-callable value — a
// problem that surfaced on Windows where Bun standalone dynamic imports can
// produce module namespaces with extra non-function metadata.
//
// This test ensures the module exports exactly one default PluginModule
// object with a callable `server` and no named exports.
test("src/index.ts exports exactly one default PluginModule object", () => {
  const keys = Object.keys(mod)
  expect(keys).toEqual(["default"])
  const plugin = (mod as { default: unknown }).default
  expect(typeof plugin).toBe("object")
  expect(plugin).not.toBeNull()
  const obj = plugin as Record<string, unknown>
  expect(typeof obj.server).toBe("function")
  expect("id" in obj).toBe(true)
})

test("package exposes a separate TUI entrypoint", () => {
  const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
    exports?: Record<string, string>
  }
  expect(pkg.exports?.["./tui"]).toBe("./src/tui.ts")
  expect(fs.existsSync(new URL("../src/tui.ts", import.meta.url))).toBe(true)
})

test("TUI entry exposes one plugin module and registers kimi:usage", async () => {
  expect(Object.keys(tuiMod)).toEqual(["default"])
  expect(tuiMod.default.id).toBe("opencode-kimi-oauth-usage")
  expect(typeof tuiMod.default.tui).toBe("function")

  let registered: (() => TuiCommand[]) | undefined
  const api = {
    command: {
      register(cb: () => TuiCommand[]) {
        registered = cb
        return () => {}
      },
    },
  } as unknown as TuiPluginApi

  await tuiMod.default.tui(api, undefined, {} as TuiPluginMeta)
  expect(registered).toBeDefined()
  const command = registered?.().find((item) => item.value === "kimi.usage")
  expect(command?.slash?.name).toBe("kimi:usage")
  expect(typeof command?.onSelect).toBe("function")
})

test("TUI entry keeps runtime imports visible to opencode's node_modules prescan", () => {
  const source = fs.readFileSync(new URL("../src/tui.ts", import.meta.url), "utf8")
  const patterns = [
    /from\s+["']([^"']+)["']/g,
    /import\s+["']([^"']+)["']/g,
    /import\s*\(\s*["']([^"']+)["']\s*\)/g,
    /require\s*\(\s*["']([^"']+)["']\s*\)/g,
  ]
  const bare = new Set<string>()
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1]
      if (specifier && !specifier.startsWith(".")) bare.add(specifier)
    }
  }

  expect([...bare].sort()).toEqual(["@opencode-ai/plugin/tui", "@opentui/solid/jsx-runtime"])
  expect(source).toMatch(/import\s+\{\s*jsx,\s*type\s+JSX\s*\}\s+from\s+["']@opentui\/solid\/jsx-runtime["']/)
  expect(source).toMatch(/import\s+type\s+\{[^}]+\}\s+from\s+["']@opencode-ai\/plugin\/tui["']/)
  expect(source).not.toContain("@jsxImportSource")
})
