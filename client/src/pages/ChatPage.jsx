import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useChatStore } from '../store/useChatStore'
import socket from '../lib/socket'
import Avatar from '../components/Avatar'

const EMOJIS = ['😀','😂','🥰','😎','😭','🤯','👍','👎','❤️','🔥','💯','🎉','😮','😴','🤔','👀','🙌','💀']

export default function ChatPage() {
  const { roomId } = useParams()
  const navigate   = useNavigate()
  const user       = useAuthStore((s) => s.user)
  const { rooms, messages, typingUsers, setCurrentRoom, updateReactions } = useChatStore()

  const room     = rooms.find((r) => r.id === roomId)
  const msgs     = messages[roomId] ?? []
  const typing   = [...(typingUsers[roomId] ?? [])]

  const [text, setText]         = useState('')
  const [replyTo, setReplyTo]   = useState(null)
  const [memberCount, setMemberCount] = useState(0)
  const [showEmoji, setShowEmoji]     = useState(false)
  const [reactTarget, setReactTarget] = useState(null) // msgId
  const [showMembers, setShowMembers] = useState(false)
  const [members, setMembers]         = useState([])
  const [pinned, setPinned]           = useState(room?.pinnedMsg ?? null)
  const [soundOn, setSoundOn]         = useState(true)

  const feedRef   = useRef(null)
  const inputRef  = useRef(null)
  const typingRef = useRef(null)
  const isTyping  = useRef(false)

  // Join room
  useEffect(() => {
    if (!roomId) return
    setCurrentRoom(roomId)
    socket.emit('joinRoom', { roomId })

    socket.on('roomHistory', ({ memberCount: mc, pinnedMsg }) => {
      setMemberCount(mc)
      setPinned(pinnedMsg)
    })
    socket.on('memberCount', setMemberCount)
    socket.on('userJoined', ({ user: u, memberCount: mc }) => {
      setMemberCount(mc)
      setMembers((m) => [...m.filter((x) => x.id !== u.id), u])
    })
    socket.on('userLeft', ({ username, memberCount: mc }) => {
      setMemberCount(mc)
      setMembers((m) => m.filter((x) => x.username !== username))
    })
    socket.on('pinnedMsg', ({ pin }) => setPinned(pin))

    return () => {
      socket.emit('leaveRoom', { roomId })
      socket.off('roomHistory')
      socket.off('memberCount')
      socket.off('userJoined')
      socket.off('userLeft')
      socket.off('pinnedMsg')
      setCurrentRoom(null)
    }
  }, [roomId])

  // Room deleted
  useEffect(() => {
    socket.on('roomDeleted', ({ roomId: id }) => {
      if (id === roomId) navigate('/')
    })
    return () => socket.off('roomDeleted')
  }, [roomId])

  // Scroll to bottom on new messages
  useEffect(() => {
    const feed = feedRef.current
    if (!feed) return
    const nearBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 150
    if (nearBottom) feed.scrollTop = feed.scrollHeight
  }, [msgs])

  // Sound ping on incoming message
  useEffect(() => {
    if (!soundOn) return
    const last = msgs.at(-1)
    if (last && last.userId !== user?.id) playPing()
  }, [msgs.length])

  function sendMessage() {
    const t = text.trim()
    if (!t) return
    socket.emit('chatMessage', { roomId, message: t, replyTo })
    setText('')
    setReplyTo(null)
    stopTyping()
    inputRef.current?.focus()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  function handleTyping() {
    if (!isTyping.current) {
      isTyping.current = true
      socket.emit('typing', { roomId, isTyping: true })
    }
    clearTimeout(typingRef.current)
    typingRef.current = setTimeout(stopTyping, 1500)
  }

  function stopTyping() {
    if (isTyping.current) {
      isTyping.current = false
      socket.emit('typing', { roomId, isTyping: false })
    }
  }

  function sendImage(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 4 * 1024 * 1024) { alert('Image too large (max 4MB)'); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      socket.emit('chatMessage', { roomId, message: '', image: ev.target.result, replyTo })
      setReplyTo(null)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function deleteMsg(msgId)  { socket.emit('deleteMsg', { roomId, msgId }) }
  function pinMsg(msgId)     { socket.emit('pinMsg', { roomId, msgId }) }
  function reactMsg(msgId, emoji) {
    socket.emit('react', { roomId, msgId, emoji })
    setShowEmoji(false); setReactTarget(null)
  }
  function deleteRoom() {
    if (!confirm('Delete this room?')) return
    socket.emit('deleteRoom', { roomId })
    navigate('/')
  }

  function playPing() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator(), gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.06, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
      osc.start(); osc.stop(ctx.currentTime + 0.25)
    } catch (_) {}
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f]">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-4 border-b border-white/5 bg-[#13131a] shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-white/40 hover:text-white/80 text-lg transition mr-1">←</button>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${room?.type === 'dm' ? 'bg-pink-500/10 text-pink-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
            {room?.type === 'dm' ? '💬' : '#'}
          </div>
          <div>
            <div className="text-sm font-bold text-white">{room?.name ?? roomId}</div>
            <div className="text-[11px] text-white/30">{room?.type === 'dm' ? 'Direct message' : `Group · by ${room?.createdBy}`}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-white/40 bg-white/5 border border-white/8 rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />{memberCount} online
          </div>
          <button onClick={() => setShowMembers((s) => !s)} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition text-base">👥</button>
          <button onClick={() => { setSoundOn((s) => !s) }} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition text-base" title="Toggle sound">
            {soundOn ? '🔔' : '🔕'}
          </button>
          {room?.type === 'group' && room?.createdBy === user?.username && (
            <button onClick={deleteRoom} className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500/60 hover:text-red-400 hover:bg-red-500/10 transition text-base">🗑</button>
          )}
        </div>
      </header>

      {/* Pinned */}
      {pinned && (
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/5 border-b border-indigo-500/10 text-xs text-white/50 cursor-pointer hover:bg-indigo-500/10 transition shrink-0"
          onClick={() => { const el = document.querySelector(`[data-id="${pinned.id}"]`); el?.scrollIntoView({ behavior:'smooth', block:'center' }) }}>
          <span className="text-indigo-400">📌</span>
          <span className="font-semibold text-indigo-300">Pinned:</span>
          <span className="truncate">{pinned.username}: {pinned.text || '📷 Image'}</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Feed */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div ref={feedRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1">
            <div className="flex items-center gap-3 text-[11px] text-white/20 my-2">
              <div className="flex-1 h-px bg-white/5" /><span>Today</span><div className="flex-1 h-px bg-white/5" />
            </div>

            {msgs.map((msg) => (
              <MessageRow key={msg.id} msg={msg} me={user}
                onReply={setReplyTo} onDelete={deleteMsg} onPin={pinMsg}
                onReact={(id) => { setReactTarget(id); setShowEmoji(true) }} />
            ))}

            {typing.length > 0 && (
              <div className="text-xs text-white/30 italic px-1 mt-1">
                {typing.join(', ')} {typing.length === 1 ? 'is' : 'are'} typing…
              </div>
            )}
          </div>

          {/* Reply bar */}
          {replyTo && (
            <div className="flex items-center gap-3 px-4 py-2 bg-white/3 border-t border-white/5 text-xs shrink-0">
              <span className="text-white/40">↩ Replying to</span>
              <span className="text-indigo-400 font-semibold">{replyTo.username}</span>
              <span className="text-white/50 truncate flex-1">{replyTo.text || '📷'}</span>
              <button onClick={() => setReplyTo(null)} className="text-white/30 hover:text-white transition text-sm">✕</button>
            </div>
          )}

          {/* Emoji picker */}
          {showEmoji && (
            <div className="mx-4 mb-2 bg-[#1a1a24] border border-white/10 rounded-2xl p-3 flex flex-wrap gap-1 shrink-0">
              {EMOJIS.map((em) => (
                <button key={em} onClick={() => reactTarget ? reactMsg(reactTarget, em) : (setText((t) => t + em), setShowEmoji(false))}
                  className="text-xl p-1.5 rounded-lg hover:bg-white/10 transition">{em}</button>
              ))}
              <button onClick={() => { setShowEmoji(false); setReactTarget(null) }} className="ml-auto text-xs text-white/30 hover:text-white px-2">✕</button>
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3 shrink-0 border-t border-white/5 pt-3">
            <div className="flex items-end gap-2 bg-[#1a1a24] border border-white/8 focus-within:border-indigo-500/50 rounded-xl px-3 py-2 transition">
              <button onClick={() => { setReactTarget(null); setShowEmoji((s) => !s) }}
                className="text-white/40 hover:text-white text-xl pb-0.5 transition shrink-0">😊</button>
              <label className="text-white/40 hover:text-white text-xl pb-0.5 transition shrink-0 cursor-pointer">
                📷<input type="file" accept="image/*" className="hidden" onChange={sendImage} />
              </label>
              <textarea ref={inputRef} value={text}
                onChange={(e) => { setText(e.target.value); handleTyping(); e.target.style.height='26px'; e.target.style.height=Math.min(e.target.scrollHeight,120)+'px' }}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${room?.type === 'dm' ? room?.name : '# ' + room?.name}…`}
                rows={1}
                className="flex-1 bg-transparent outline-none text-sm text-white placeholder-white/20 resize-none min-h-[26px] max-h-[120px] leading-relaxed" />
              <button onClick={sendMessage} disabled={!text.trim()}
                className="bg-indigo-500 hover:bg-indigo-400 disabled:bg-white/10 disabled:text-white/20 text-white rounded-lg w-8 h-8 flex items-center justify-center text-base transition shrink-0 active:scale-95">↑</button>
            </div>
          </div>
        </div>

        {/* Members panel */}
        {showMembers && (
          <aside className="w-52 shrink-0 border-l border-white/5 bg-[#13131a] flex flex-col overflow-y-auto p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-3">Members</div>
            {members.length === 0
              ? <p className="text-xs text-white/25">No one yet</p>
              : members.map((m) => (
                <div key={m.id} className="flex items-center gap-2 py-1.5">
                  <Avatar username={m.username} color={m.color} size={26} />
                  <span className="text-xs text-white/70 truncate">{m.username}</span>
                </div>
              ))}
          </aside>
        )}
      </div>
    </div>
  )
}

function MessageRow({ msg, me, onReply, onDelete, onPin, onReact }) {
  const isMe = msg.userId === me?.id

  return (
    <div data-id={msg.id} className={`flex gap-2.5 group px-1 py-0.5 rounded-xl hover:bg-white/3 transition ${isMe ? 'flex-row-reverse' : ''}`}>
      <div className="shrink-0 self-end">
        <Avatar username={msg.username} color={msg.color || '#6366f1'} size={30} />
      </div>
      <div className={`flex flex-col max-w-[65%] ${isMe ? 'items-end' : 'items-start'}`}>
        {/* Sender + time */}
        <div className={`flex items-baseline gap-2 mb-1 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
          {!isMe && <span className="text-xs font-bold" style={{ color: msg.color || '#818cf8' }}>{msg.username}</span>}
          <span className="text-[10px] text-white/25">{new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        {/* Reply quote */}
        {msg.replyTo && (
          <div className="bg-white/5 border-l-2 border-indigo-400 rounded-lg px-3 py-1.5 mb-1 text-xs text-white/50 cursor-pointer hover:bg-white/8 transition max-w-full">
            <span className="text-indigo-300 font-semibold block">{msg.replyTo.username}</span>
            <span className="truncate block">{msg.replyTo.text || '📷 Image'}</span>
          </div>
        )}

        {/* Bubble */}
        <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed break-words max-w-full ${
          msg.deleted ? 'bg-transparent border border-white/10 text-white/30 italic' :
          isMe ? 'bg-indigo-500/80 text-white' : 'bg-[#1e1e2e] text-white/90'
        }`}>
          {msg.deleted ? 'Message deleted' : (
            <>
              {msg.image && <img src={msg.image} alt="img" className="max-w-[220px] max-h-[200px] rounded-lg mb-1 cursor-pointer" onClick={() => window.open(msg.image)} />}
              {msg.text && <span>{msg.text}</span>}
            </>
          )}
        </div>

        {/* Reactions */}
        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(msg.reactions).map(([emoji, users]) => users.length > 0 && (
              <button key={emoji} onClick={() => { /* re-react */ }}
                className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition ${
                  users.includes(me?.id) ? 'bg-indigo-500/20 border-indigo-500/40' : 'bg-white/5 border-white/10 hover:border-white/25'
                }`}>
                {emoji} <span className="text-white/50">{users.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons — appear on hover */}
      {!msg.deleted && (
        <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition self-center ${isMe ? 'flex-row-reverse' : ''}`}>
          <ActionBtn title="React"  onClick={() => onReact(msg.id)}>😊</ActionBtn>
          <ActionBtn title="Reply"  onClick={() => onReply({ id: msg.id, username: msg.username, text: msg.text })}>↩</ActionBtn>
          <ActionBtn title="Pin"    onClick={() => onPin(msg.id)}>📌</ActionBtn>
          {isMe && <ActionBtn title="Delete" onClick={() => onDelete(msg.id)} danger>🗑</ActionBtn>}
        </div>
      )}
    </div>
  )
}

function ActionBtn({ children, onClick, title, danger }) {
  return (
    <button onClick={onClick} title={title}
      className={`w-7 h-7 flex items-center justify-center rounded-lg text-sm transition ${
        danger ? 'text-red-500/60 hover:text-red-400 hover:bg-red-500/10' : 'text-white/30 hover:text-white hover:bg-white/8'
      }`}>{children}</button>
  )
}
