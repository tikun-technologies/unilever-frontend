import { describe, expect, it } from "vitest"
import { mergeChatMessages, scrollTopAfterPrepend } from "./assistantChatMerge"

describe("assistantChatMerge", () => {
  it("dedupes by server id when prepending older pages", () => {
    const existing = [
      { id: "2", serverId: "2", role: "user" as const },
      { id: "3", serverId: "3", role: "assistant" as const },
    ]
    const older = [
      { id: "1", serverId: "1", role: "user" as const },
      { id: "2", serverId: "2", role: "user" as const },
    ]
    const merged = mergeChatMessages(existing, older, "prepend")
    expect(merged.map((m) => m.id)).toEqual(["1", "2", "3"])
  })

  it("reconciles optimistic client id with server id", () => {
    const optimistic = [{ id: "tmp", clientMessageId: "c1", role: "user" as const }]
    const server = [{ id: "srv", serverId: "srv", clientMessageId: "c1", role: "user" as const }]
    const merged = mergeChatMessages(optimistic, server, "append")
    expect(merged).toHaveLength(1)
    expect(merged[0].serverId).toBe("srv")
  })

  it("preserves scroll anchor after prepend height growth", () => {
    expect(scrollTopAfterPrepend(1000, 40, 1400)).toBe(440)
  })
})
