/** Helpers for assistant history merge / scroll-anchor math. */

export type ChatLike = {
  id: string
  role: "user" | "assistant"
  serverId?: string | null
  clientMessageId?: string | null
}

export function mergeChatMessages(
  existing: ChatLike[],
  incoming: ChatLike[],
  mode: "prepend" | "replace" | "append"
): ChatLike[] {
  const seen = new Set<string>()
  const out: ChatLike[] = []

  const push = (msg: ChatLike) => {
    const key = msg.serverId || msg.id
    if (seen.has(key)) return
    if (msg.clientMessageId) {
      const dup = out.find(
        (m) => m.clientMessageId && m.clientMessageId === msg.clientMessageId && m.role === msg.role
      )
      if (dup) {
        if (msg.serverId && !dup.serverId) {
          Object.assign(dup, msg)
        }
        return
      }
    }
    seen.add(key)
    out.push(msg)
  }

  if (mode === "replace") {
    incoming.forEach(push)
    return out
  }
  if (mode === "prepend") {
    incoming.forEach(push)
    existing.forEach(push)
    return out
  }
  existing.forEach(push)
  incoming.forEach(push)
  return out
}

export function scrollTopAfterPrepend(prevHeight: number, prevTop: number, nextHeight: number): number {
  return prevTop + (nextHeight - prevHeight)
}
