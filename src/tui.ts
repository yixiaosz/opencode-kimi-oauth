import { jsx, type JSX } from "@opentui/solid/jsx-runtime"
import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui"
import { ensureFreshStoredAuth } from "./auth-refresh.ts"
import { fetchUsage, parseUsagePayload, type UsageRow } from "./usage.ts"

type UsageViewRow = UsageRow & {
  remaining: number
  percent: number
  ratio: number
}

const BAR_WIDTH = 56

function element<Tag extends Extract<keyof JSX.IntrinsicElements, string>>(
  tag: Tag,
  props: JSX.IntrinsicElements[Tag],
): JSX.Element {
  return jsx(tag, props as Record<string, unknown>)
}

function usageViewRow(row: UsageRow): UsageViewRow {
  if (row.limit <= 0) {
    return { ...row, remaining: 0, percent: 0, ratio: 0 }
  }
  const remaining = Math.min(Math.max(row.limit - row.used, 0), row.limit)
  const ratio = remaining / row.limit
  return {
    ...row,
    remaining,
    ratio,
    percent: Math.round(ratio * 100),
  }
}

function usageTone(api: TuiPluginApi, row: UsageViewRow) {
  if (row.ratio <= 0.1) return api.theme.current.error
  if (row.ratio <= 0.3) return api.theme.current.warning
  return api.theme.current.primary
}

function usageBar(row: UsageViewRow) {
  const complete = Math.round(row.ratio * BAR_WIDTH)
  return {
    complete: "█".repeat(complete),
    empty: "░".repeat(BAR_WIDTH - complete),
  }
}

function UsageLoadingRow(props: { label: string; theme: TuiPluginApi["theme"]["current"] }): JSX.Element {
  return element("box", {
    gap: 0,
    width: "100%",
    children: [
      element("text", { fg: props.theme.text, children: props.label }),
      element("box", {
        flexDirection: "row",
        width: "100%",
        overflow: "hidden",
        children: element("text", {
          fg: props.theme.textMuted,
          wrapMode: "none",
          overflow: "hidden",
          children: "░".repeat(BAR_WIDTH),
        }),
      }),
      element("box", {
        flexDirection: "row",
        width: "100%",
        children: element("text", { fg: props.theme.textMuted, children: "loading" }),
      }),
    ],
  })
}

function UsageDialog(props: { api: TuiPluginApi; rows?: UsageRow[]; loading?: boolean }): JSX.Element {
  const rows = (props.rows ?? []).map(usageViewRow)
  const close = () => props.api.ui.dialog.clear()
  const theme = props.api.theme.current

  const body = props.loading
    ? element("box", {
        gap: 1,
        paddingBottom: 1,
        children: [
          UsageLoadingRow({ label: "Weekly limit", theme }),
          UsageLoadingRow({ label: "5h limit", theme }),
        ],
      })
    : rows.length === 0
      ? element("box", {
          paddingTop: 1,
          paddingBottom: 1,
          children: element("text", { fg: theme.textMuted, children: "No usage data available." }),
        })
      : element("box", {
          gap: 1,
          paddingBottom: 1,
          children: rows.map((row) => {
            const tone = usageTone(props.api, row)
            const bar = usageBar(row)
            return element("box", {
              gap: 0,
              width: "100%",
              children: [
                element("text", { fg: theme.text, children: row.label }),
                element("box", {
                  flexDirection: "row",
                  width: "100%",
                  overflow: "hidden",
                  children: [
                    element("text", {
                      fg: tone,
                      wrapMode: "none",
                      overflow: "hidden",
                      children: bar.complete,
                    }),
                    element("text", {
                      fg: theme.textMuted,
                      wrapMode: "none",
                      overflow: "hidden",
                      children: bar.empty,
                    }),
                  ],
                }),
                element("box", {
                  flexDirection: "row",
                  justifyContent: "space-between",
                  width: "100%",
                  children: [
                    element("text", { fg: theme.textMuted, children: row.resetHint ?? "" }),
                    element("text", { fg: tone, children: `${row.percent}% left` }),
                  ],
                }),
              ],
            })
          }),
        })

  return element("box", {
    paddingLeft: 2,
    paddingRight: 2,
    gap: 1,
    children: [
      element("box", {
        flexDirection: "row",
        justifyContent: "space-between",
        children: [
          element("text", {
            children: element("span", {
              style: { fg: theme.text, bold: true },
              children: "Kimi Usage",
            }),
          }),
          element("text", { fg: theme.textMuted, onMouseUp: close, children: "esc" }),
        ],
      }),
      body,
    ],
  })
}

const tui: TuiPlugin = async (api) => {
  let usageRequestId = 0

  api.command.register(() => [
    {
      title: "Kimi usage",
      value: "kimi.usage",
      description: "Show Kimi Code subscription usage",
      category: "Kimi",
      slash: {
        name: "kimi:usage",
      },
      onSelect: async () => {
        const requestId = ++usageRequestId
        let dismissed = false
        let replacing = false
        const isCurrent = () => usageRequestId === requestId && !dismissed
        const markDismissed = () => {
          if (!replacing) dismissed = true
        }

        api.ui.dialog.replace(() => UsageDialog({ api, loading: true }), markDismissed)
        try {
          const auth = await ensureFreshStoredAuth()
          const payload = await fetchUsage(auth.access)
          const rows = parseUsagePayload(payload)
          if (!isCurrent()) return
          replacing = true
          try {
            api.ui.dialog.replace(() => UsageDialog({ api, rows }), markDismissed)
          } finally {
            replacing = false
          }
        } catch (error) {
          if (!isCurrent()) return
          api.ui.dialog.clear()
          api.ui.toast({
            message: error instanceof Error ? error.message : "Failed to fetch Kimi usage.",
            variant: "error",
            duration: 6_000,
          })
        }
      },
    },
  ])
}

export default {
  id: "opencode-kimi-oauth-usage",
  tui,
} satisfies TuiPluginModule
