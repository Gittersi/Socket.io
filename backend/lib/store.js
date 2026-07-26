// ─── In-memory data stores ────────────────────────────────────────────────────

export const users   = new Map()   // socketId  -> { id, username, color, bio, status, lastSeen, mutedRooms }
export const rooms   = new Map()   // roomId    -> Room object
export const sockets = new Map()   // socketId  -> { userId, roomId }
export const onlineUserIds = new Set() // Set of userIds currently connected

/**
 * Room shape:
 * { id, name, type, dmKey?, createdBy, inviteCode,
 *   members: Set<userId>, memberRoles: Map<userId,'admin'|'member'>,
 *   messages: [], pinnedMsg?, description, isPrivate, mutedBy: Set<userId> }
 */

export function roomPublicData(room) {
  return {
    id:          room.id,
    name:        room.name,
    type:        room.type,
    createdBy:   room.createdBy,
    memberCount: room.members.size,
    lastMsg:     room.messages.at(-1) ? serializeMsg(room.messages.at(-1)) : null,
    pinnedMsg:   room.pinnedMsg ?? null,
    description: room.description ?? '',
    isPrivate:   room.isPrivate ?? false,
    inviteCode:  room.inviteCode ?? null,
  }
}

export function serializeMsg(msg) {
  if (!msg) return null
  return { ...msg, reactions: serializeReactions(msg.reactions ?? {}) }
}

export function serializeReactions(reactions) {
  const out = {}
  for (const [emoji, set] of Object.entries(reactions)) {
    out[emoji] = set instanceof Set ? [...set] : set
  }
  return out
}
