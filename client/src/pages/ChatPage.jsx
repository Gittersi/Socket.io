import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useChatStore } from '../store/useChatStore'
import { useThemeStore } from '../store/useThemeStore'
import socket from '../lib/socket'
import Avatar from '../components/Avatar'
import MarkdownText from '../components/MarkdownText'
import LinkPreview from '../components/LinkPreview'
import AudioPlayer from '../components/AudioPlayer'
import VoiceRecorder from '../components/VoiceRecorder'
import ImageEditModal from '../components/ImageEditModal'
import GroupInfoDrawer from '../components/GroupInfoDrawer'
import CallModal from '../components/CallModal'

const EMOJIS = ['😀','😂','🥰','😎','😭','🤯','👍','👎','❤️','🔥','💯','🎉','😮','😴','🤔','👀','🙌','💀']

export default function ChatPage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { rooms, messages, typingUsers, setCurrentRoom } = useChatStore()
  const { theme, setTheme } = useThemeStore()

  const room = rooms.find((r) => r.id === roomId)
  const msgs = messages[roomId] ?? []
  const typing = [...(typingUsers[roomId] ?? [])]

  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [memberCount, setMemberCount] = useState(0)
  const [showEmoji, setShowEmoji] = useState(false)
  const [reactTarget, setReactTarget] = useState(null)
  const [showMembers, setShowMembers] = useState(false)
  const [members, setMembers] = useState([])
  const [pinned, setPinned] = useState(room?.pinnedMsg ?? null)
  const [soundOn, setSoundOn] = useState(true)
  const [myRole, setMyRole] = useState('member')

  // Voice & Image & Video States
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  const [pendingImageSrc, setPendingImageSrc] = useState(null)

  // WebRTC Call State
  const [activeCall, setActiveCall] = useState(null) // null | callData object

  const feedRef = useRef(null)
  const inputRef = useRef(null)
  const typingRef = useRef(null)
  const isTyping = useRef(false)

  // Join room and socket event setup
  useEffect(() => {
    if (!roomId) return
    setCurrentRoom(roomId)
    socket.emit('joinRoom', { roomId })

    socket.on('roomHistory', ({ memberCount: mc, pinnedMsg, myRole: role }) => {
      setMemberCount(mc)
      setPinned(pinnedMsg)
      if (role) setMyRole(role)
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

    // Incoming WebRTC Call Handler
    socket.on('incomingCall', (callData) => {
      setActiveCall({ ...callData, isIncoming: true })
    })

    return () => {
      socket.emit('leaveRoom', { roomId })
      socket.off('roomHistory')
      socket.off('memberCount')
      socket.off('userJoined')
      socket.off('userLeft')
      socket.off('pinnedMsg')
      socket.off('incomingCall')
      setCurrentRoom(null)
    }
  }, [roomId])

  // Scroll to bottom on new messages
  useEffect(() => {
    const feed = feedRef.current
    if (!feed) return
    const nearBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 180
    if (nearBottom) feed.scrollTop = feed.scrollHeight
  }, [msgs])

  // Mark messages as read when scrolling
  useEffect(() => {
    const lastMsg = msgs.at(-1)
    if (lastMsg && lastMsg.userId !== user?.id && !lastMsg.readBy?.includes(user?.id)) {
      socket.emit('markRead', { roomId, msgId: lastMsg.id })
    }
  }, [msgs.length, roomId, user?.id])

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

  function handleSelectImageFile(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 8 * 1024 * 1024) { alert('File too large (max 8MB)'); return }

    if (file.type.startsWith('video/')) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        socket.emit('chatMessage', { roomId, message: '', video: ev.target.result, replyTo })
        setReplyTo(null)
      }
      reader.readAsDataURL(file)
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (ev) => setPendingImageSrc(ev.target.result)
      reader.readAsDataURL(file)
    } else {
      // Document file
      const reader = new FileReader()
      reader.onload = (ev) => {
        socket.emit('chatMessage', {
          roomId,
          message: '',
          file: { name: file.name, size: (file.size / 1024).toFixed(1) + ' KB', type: file.type, data: ev.target.result },
          replyTo
        })
        setReplyTo(null)
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }

  function handleSendVoiceMessage(voiceBase64) {
    socket.emit('chatMessage', { roomId, message: '', voice: voiceBase64, replyTo })
    setIsRecordingVoice(false)
    setReplyTo(null)
  }

  function handleStartCall(isVideo) {
    // Find target user for DMs or call first online member
    let targetUser = null
    if (room?.type === 'dm') {
      const otherMember = members.find((m) => m.id !== user?.id)
      if (otherMember) targetUser = otherMember
    }
    setActiveCall({
      isIncoming: false,
      fromUser: user,
      targetUser,
      isVideo,
      roomId
    })
  }

  function deleteMsg(msgId) { socket.emit('deleteMsg', { roomId, msgId }) }
  function pinMsg(msgId) { socket.emit('pinMsg', { roomId, msgId }) }
  function reactMsg(msgId, emoji) {
    socket.emit('react', { roomId, msgId, emoji })
    setShowEmoji(false); setReactTarget(null)
  }

  const isChannel = room?.type === 'channel'
  const isChannelAdmin = isChannel && (myRole === 'admin' || room?.createdBy === user?.username)
  const canPost = !isChannel || isChannelAdmin

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f] text-white select-none">
      {/* Image Editor Modal */}
      {pendingImageSrc && (
        <ImageEditModal
          imageSrc={pendingImageSrc}
          onClose={() => setPendingImageSrc(null)}
          onSend={(processedSrc) => {
            socket.emit('chatMessage', { roomId, message: '', image: processedSrc, replyTo })
            setPendingImageSrc(null)
            setReplyTo(null)
          }}
        />
      )}

      {/* WebRTC Audio/Video Call Modal */}
      {activeCall && (
        <CallModal callData={activeCall} onEndCall={() => setActiveCall(null)} />
      )}

      {/* Header */}
      <header className="h-14 flex items-center justify-between px-4 border-b border-white/5 bg-[#13131a] shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-white/40 hover:text-white text-lg transition mr-1">←</button>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
            room?.type === 'dm' ? 'bg-pink-500/10 text-pink-400' : room?.type === 'channel' ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-500/10 text-indigo-400'
          }`}>
            {room?.type === 'dm' ? '💬' : room?.type === 'channel' ? '📢' : '#'}
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>{room?.name || roomId}</span>
              {isChannel && <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-semibold">Channel</span>}
            </div>
            <div className="text-[11px] text-white/30">{room?.type === 'dm' ? 'Direct message' : `by ${room?.createdBy}`}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setTheme(theme === 'dark' ? 'glass' : theme === 'glass' ? 'light' : 'dark')}
            title="Switch Theme (Dark / Glassmorphism / Light)"
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 hover:border-white/20 transition font-medium mr-1">
            <span>{theme === 'glass' ? '💎 Glass' : theme === 'light' ? '☀️ Light' : '🌙 Dark'}</span>
          </button>
          {/* Call Buttons */}
          <button onClick={() => handleStartCall(false)} title="Start Voice Call"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition text-base">
            📞
          </button>
          <button onClick={() => handleStartCall(true)} title="Start Video Call"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition text-base">
            📹
          </button>

          <div className="flex items-center gap-1.5 text-xs text-white/40 bg-white/5 border border-white/8 rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />{memberCount} online
          </div>
          <button onClick={() => setShowMembers((s) => !s)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition text-base">👥</button>
        </div>
      </header>

      {/* Pinned Message */}
      {pinned && (
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/5 border-b border-indigo-500/10 text-xs text-white/50 cursor-pointer hover:bg-indigo-500/10 transition shrink-0"
          onClick={() => { const el = document.querySelector(`[data-id="${pinned.id}"]`); el?.scrollIntoView({ behavior:'smooth', block:'center' }) }}>
          <span className="text-indigo-400">📌</span>
          <span className="font-semibold text-indigo-300">Pinned:</span>
          <span className="truncate">{pinned.username}: {pinned.text || '📷 Attachment'}</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Chat Feed */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div ref={feedRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1">
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

          {/* Reply Bar */}
          {replyTo && (
            <div className="flex items-center gap-3 px-4 py-2 bg-white/3 border-t border-white/5 text-xs shrink-0">
              <span className="text-white/40">↩ Replying to</span>
              <span className="text-indigo-400 font-semibold">{replyTo.username}</span>
              <span className="text-white/50 truncate flex-1">{replyTo.text || '📎 Media'}</span>
              <button onClick={() => setReplyTo(null)} className="text-white/30 hover:text-white transition text-sm">✕</button>
            </div>
          )}

          {/* Emoji Picker */}
          {showEmoji && (
            <div className="mx-4 mb-2 bg-[#1a1a24] border border-white/10 rounded-2xl p-3 flex flex-wrap gap-1 shrink-0 shadow-xl">
              {EMOJIS.map((em) => (
                <button key={em} onClick={() => reactTarget ? reactMsg(reactTarget, em) : (setText((t) => t + em), setShowEmoji(false))}
                  className="text-xl p-1.5 rounded-lg hover:bg-white/10 transition">{em}</button>
              ))}
              <button onClick={() => { setShowEmoji(false); setReactTarget(null) }} className="ml-auto text-xs text-white/30 hover:text-white px-2">✕</button>
            </div>
          )}

          {/* Input Bar */}
          <div className="px-3 pb-3 shrink-0 border-t border-white/5 pt-3">
            {isRecordingVoice ? (
              <VoiceRecorder onSendVoice={handleSendVoiceMessage} onCancel={() => setIsRecordingVoice(false)} />
            ) : canPost ? (
              <div className="flex items-end gap-2 bg-[#1a1a24] border border-white/8 focus-within:border-indigo-500/50 rounded-xl px-3 py-2 transition">
                <button onClick={() => { setReactTarget(null); setShowEmoji((s) => !s) }}
                  className="text-white/40 hover:text-white text-xl pb-0.5 transition shrink-0">😊</button>

                <label title="Attach image / video / document" className="text-white/40 hover:text-white text-xl pb-0.5 transition shrink-0 cursor-pointer">
                  📎<input type="file" onChange={handleSelectImageFile} className="hidden" />
                </label>

                <button onClick={() => setIsRecordingVoice(true)} title="Record Voice Message"
                  className="text-white/40 hover:text-white text-xl pb-0.5 transition shrink-0">🎙️</button>

                <textarea ref={inputRef} value={text}
                  onChange={(e) => { setText(e.target.value); handleTyping(); e.target.style.height='26px'; e.target.style.height=Math.min(e.target.scrollHeight,120)+'px' }}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${room?.type === 'dm' ? room?.name : '#' + room?.name}… (**bold**, *italic*, \`code\` supported)`}
                  rows={1}
                  className="flex-1 bg-transparent outline-none text-sm text-white placeholder-white/20 resize-none min-h-[26px] max-h-[120px] leading-relaxed" />

                <button onClick={sendMessage} disabled={!text.trim()}
                  className="bg-indigo-500 hover:bg-indigo-400 disabled:bg-white/10 disabled:text-white/20 text-white rounded-lg w-8 h-8 flex items-center justify-center text-base transition shrink-0 active:scale-95">↑</button>
              </div>
            ) : (
              <div className="bg-white/3 border border-white/5 rounded-xl p-3 text-center text-xs text-white/40 italic">
                Only channel admins can post in this broadcast channel.
              </div>
            )}
          </div>
        </div>

        {/* Group Info Drawer */}
        {showMembers && (
          <GroupInfoDrawer room={room} members={members} myRole={myRole} onClose={() => setShowMembers(false)} />
        )}
      </div>
    </div>
  )
}

function MessageRow({ msg, me, onReply, onDelete, onPin, onReact }) {
  const isMe = msg.userId === me?.id
  const isRead = msg.readBy && msg.readBy.length > 1

  return (
    <div data-id={msg.id} className={`flex gap-2.5 group px-1 py-0.5 rounded-xl hover:bg-white/3 transition ${isMe ? 'flex-row-reverse' : ''}`}>
      <div className="shrink-0 self-end">
        <Avatar username={msg.username} color={msg.color || '#6366f1'} size={30} />
      </div>
      <div className={`flex flex-col max-w-[68%] ${isMe ? 'items-end' : 'items-start'}`}>
        {/* Sender + time */}
        <div className={`flex items-baseline gap-2 mb-1 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
          {!isMe && <span className="text-xs font-bold" style={{ color: msg.color || '#818cf8' }}>{msg.username}</span>}
          <span className="text-[10px] text-white/25 flex items-center gap-1">
            {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {isMe && (
              <span title={isRead ? 'Read by recipient' : 'Sent'} className={isRead ? 'text-indigo-400 font-bold' : 'text-white/30'}>
                {isRead ? '✓✓' : '✓'}
              </span>
            )}
          </span>
        </div>

        {/* Reply quote */}
        {msg.replyTo && (
          <div className="bg-white/5 border-l-2 border-indigo-400 rounded-lg px-3 py-1.5 mb-1 text-xs text-white/50 cursor-pointer hover:bg-white/8 transition max-w-full">
            <span className="text-indigo-300 font-semibold block">{msg.replyTo.username}</span>
            <span className="truncate block">{msg.replyTo.text || '📎 Media attachment'}</span>
          </div>
        )}

        {/* Message Bubble */}
        <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words max-w-full ${
          msg.deleted ? 'bg-transparent border border-white/10 text-white/30 italic' :
          isMe ? 'bg-indigo-600/90 text-white shadow-md' : 'bg-[#1e1e2e] text-white/90 shadow-md'
        }`}>
          {msg.deleted ? 'Message deleted' : (
            <>
              {/* Image Attachment */}
              {msg.image && (
                <img src={msg.image} alt="uploaded"
                  className="max-w-[240px] max-h-[220px] rounded-xl mb-1.5 cursor-pointer object-cover shadow-sm hover:opacity-90 transition"
                  onClick={() => window.open(msg.image)} />
              )}

              {/* Video Attachment */}
              {msg.video && (
                <video src={msg.video} controls className="max-w-[260px] rounded-xl mb-1.5 border border-white/10" />
              )}

              {/* Voice Message */}
              {msg.voice && <AudioPlayer src={msg.voice} />}

              {/* Document File Attachment */}
              {msg.file && (
                <a href={msg.file.data} download={msg.file.name}
                  className="flex items-center gap-2 bg-black/30 border border-white/10 p-2 rounded-xl text-xs hover:border-indigo-400 transition my-1">
                  <span className="text-lg">📄</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white truncate">{msg.file.name}</div>
                    <div className="text-[10px] text-white/40">{msg.file.size}</div>
                  </div>
                  <span className="text-indigo-300 text-xs font-bold">Download</span>
                </a>
              )}

              {/* Text Message with Markdown */}
              {msg.text && <MarkdownText content={msg.text} />}

              {/* Link Card Preview */}
              {msg.text && <LinkPreview text={msg.text} />}
            </>
          )}
        </div>

        {/* Reactions */}
        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(msg.reactions).map(([emoji, users]) => users.length > 0 && (
              <button key={emoji} onClick={() => onReact(msg.id, emoji)}
                className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition ${
                  users.includes(me?.id) ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'bg-white/5 border-white/10 hover:border-white/25'
                }`}>
                {emoji} <span className="text-white/50">{users.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {!msg.deleted && (
        <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition self-center ${isMe ? 'flex-row-reverse' : ''}`}>
          <ActionBtn title="React" onClick={() => onReact(msg.id)}>😊</ActionBtn>
          <ActionBtn title="Reply" onClick={() => onReply({ id: msg.id, username: msg.username, text: msg.text })}>↩</ActionBtn>
          <ActionBtn title="Pin" onClick={() => onPin(msg.id)}>📌</ActionBtn>
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
