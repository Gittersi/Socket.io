import React, { useState } from 'react'

export default function CreateRoomModal({ onCreate, onClose }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('group') // 'group' | 'channel'
  const [isPrivate, setIsPrivate] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onCreate({ name: name.trim(), description: description.trim(), isPrivate, type })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#13131a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            ✨ Create {type === 'channel' ? 'Broadcast Channel' : 'Group Chat'}
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
          {/* Type selector */}
          <div className="grid grid-cols-2 gap-2 bg-[#1a1a24] p-1 rounded-xl border border-white/5">
            <button type="button" onClick={() => setType('group')}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                type === 'group' ? 'bg-indigo-500 text-white shadow-md' : 'text-white/40 hover:text-white'
              }`}>
              👥 Group Chat
            </button>
            <button type="button" onClick={() => setType('channel')}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                type === 'channel' ? 'bg-pink-500 text-white shadow-md' : 'text-white/40 hover:text-white'
              }`}>
              📢 Broadcast Channel
            </button>
          </div>

          <div className="text-[11px] text-white/40 bg-white/3 p-2.5 rounded-xl border border-white/5">
            {type === 'group'
              ? 'Group chats allow all members to send messages, upload media, and chat together.'
              : 'Broadcast channels allow admins to post updates. Subscribers can only read messages.'}
          </div>

          <div>
            <label className="text-xs text-white/50 block mb-1">Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={30}
              placeholder={type === 'group' ? 'e.g. Design Team' : 'e.g. Company News'}
              className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500" />
          </div>

          <div>
            <label className="text-xs text-white/50 block mb-1">Description (Optional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              placeholder="What is this group/channel about?"
              className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 resize-none" />
          </div>

          <div className="flex items-center justify-between bg-white/3 p-3 rounded-xl border border-white/5">
            <div>
              <div className="text-xs font-semibold text-white">Private Room</div>
              <div className="text-[11px] text-white/40">Only joinable via invite code or link</div>
            </div>
            <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4 accent-indigo-500 cursor-pointer" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-white/50 hover:text-white transition">Cancel</button>
            <button type="submit" className="px-5 py-2 text-xs bg-indigo-500 hover:bg-indigo-400 font-bold text-white rounded-xl transition shadow-lg shadow-indigo-500/25">
              Create Now
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
