// ─── In-memory data stores ────────────────────────────────────────────────────
// In production you'd swap these for a real DB (MongoDB, PostgreSQL, etc.)

export const users = new Map()      // sessionId  -> { id, username, color, joinedAt }
export const rooms = new Map()      // roomId     -> Room object
export const sockets = new Map()    // socketId   -> { userId, roomId }

/**
 * @typedef {Object} Room
 * @property {string}  id
 * @property {string}  name
 * @property {'group'|'dm'} type
 * @property {string}  [dmKey]
 * @property {string}  createdBy   username for group, userId for dm
 * @property {Set}     members     Set of userIds currently in room
 * @property {Array}   messages    last 300 messages
 * @property {Object}  [pinnedMsg] { id, text, username }
 */

export function roomPublicData(room) {
  return {
    id:          room.id,
    name:        room.name,
    type:        room.type,
    createdBy:   room.createdBy,
    memberCount: room.members.size,
    lastMsg:     room.messages.at(-1) ?? null,
    pinnedMsg:   room.pinnedMsg ?? null,
  }
}

export function serializeMsg(msg) {
  return { ...msg, reactions: serializeReactions(msg.reactions) }
}

export function serializeReactions(reactions) {
  const out = {}
  for (const [emoji, set] of Object.entries(reactions)) {
    out[emoji] = [...set]
  }
  return out
}
