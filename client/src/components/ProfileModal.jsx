import React, { useState } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import Avatar from './Avatar'

const PRESET_COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#14b8a6']
const AVATAR_PRESETS = ['🐱', '🐶', '🦊', '🐯', '🤖', '👾', '🚀', '👑', '⚡', '🔥']

export default function ProfileModal({ onClose }) {
  const { user, setAuth } = useAuthStore()
  const [activeTab, setActiveTab] = useState('profile') // 'profile' | 'privacy' | 'security'

  // Profile Form state
  const [statusText, setStatusText] = useState(user?.status_text || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [color, setColor] = useState(user?.color || '#6366f1')
  const [avatar, setAvatar] = useState(user?.avatar || '')

  // Privacy State
  const [privacyLastSeen, setPrivacyLastSeen] = useState(user?.privacy_last_seen || 'everyone')
  const [privacyProfile, setPrivacyProfile] = useState(user?.privacy_profile || 'everyone')
  const [readReceipts, setReadReceipts] = useState(user?.read_receipts_enabled ?? true)

  // 2FA State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.two_factor_enabled || false)
  const [qrCodeUrl, setQrCodeUrl] = useState(null)
  const [twoFactorSecret, setTwoFactorSecret] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [msg, setMsg] = useState('')

  const handleSaveProfile = async () => {
    try {
      const res = await fetch('/api/profile/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`
        },
        body: JSON.stringify({
          bio,
          status_text: statusText,
          color,
          avatar,
          privacy_last_seen: privacyLastSeen,
          privacy_profile: privacyProfile,
          read_receipts_enabled: readReceipts
        })
      })
      const data = await res.json()
      if (res.ok) {
        setAuth(data.user, data.accessToken)
        setMsg('Profile updated successfully!')
        setTimeout(() => setMsg(''), 2500)
      } else {
        alert(data.error || 'Failed to update profile')
      }
    } catch (err) {
      alert('Error updating profile: ' + err.message)
    }
  }

  const handleStart2FASetup = async () => {
    try {
      const res = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken}` }
      })
      const data = await res.json()
      setQrCodeUrl(data.qrCodeUrl)
      setTwoFactorSecret(data.secret)
    } catch (err) {
      alert('2FA setup failed: ' + err.message)
    }
  }

  const handleVerify2FA = async () => {
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`
        },
        body: JSON.stringify({ secret: twoFactorSecret, code: otpCode })
      })
      const data = await res.json()
      if (res.ok) {
        setTwoFactorEnabled(true)
        setQrCodeUrl(null)
        setMsg('2FA has been enabled!')
      } else {
        alert(data.error || 'Invalid code')
      }
    } catch (err) {
      alert('Verification error')
    }
  }

  const handleDisable2FA = async () => {
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken}` }
      })
      if (res.ok) {
        setTwoFactorEnabled(false)
        setMsg('2FA disabled')
      }
    } catch (err) {}
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#13131a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            👤 User Settings & Profile
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition">✕</button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/5 bg-[#1a1a24] px-4 pt-2 gap-4">
          <button onClick={() => setActiveTab('profile')}
            className={`pb-2 text-xs font-semibold border-b-2 transition ${
              activeTab === 'profile' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-white/40 hover:text-white'
            }`}>
            Profile
          </button>
          <button onClick={() => setActiveTab('privacy')}
            className={`pb-2 text-xs font-semibold border-b-2 transition ${
              activeTab === 'privacy' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-white/40 hover:text-white'
            }`}>
            Privacy
          </button>
          <button onClick={() => setActiveTab('security')}
            className={`pb-2 text-xs font-semibold border-b-2 transition ${
              activeTab === 'security' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-white/40 hover:text-white'
            }`}>
            2FA Security
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto max-h-[420px]">
          {msg && (
            <div className="mb-3 p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg text-center font-medium">
              {msg}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4 bg-white/3 p-3 rounded-xl border border-white/5">
                <Avatar username={user?.username} color={color} size={48} />
                <div>
                  <div className="text-sm font-bold text-white">{user?.username}</div>
                  <div className="text-xs text-white/40">{user?.email || 'No email associated'}</div>
                </div>
              </div>

              <div>
                <label className="text-xs text-white/50 block mb-1">Avatar Emoji / Icon</label>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {AVATAR_PRESETS.map((av) => (
                    <button key={av} onClick={() => setAvatar(av)}
                      className={`text-lg p-1.5 rounded-lg border transition ${
                        avatar === av ? 'bg-indigo-500/20 border-indigo-500' : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}>
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-white/50 block mb-1">Status Text</label>
                <input type="text" value={statusText} onChange={(e) => setStatusText(e.target.value)}
                  placeholder="e.g., At the gym, In a meeting…"
                  className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500" />
              </div>

              <div>
                <label className="text-xs text-white/50 block mb-1">About Bio</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell people a bit about yourself…" rows={2}
                  className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 resize-none" />
              </div>

              <div>
                <label className="text-xs text-white/50 block mb-1">Profile Accent Color</label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button key={c} onClick={() => setColor(c)} style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full border-2 transition ${color === c ? 'border-white scale-110' : 'border-transparent opacity-70 hover:opacity-100'}`} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-white/50 block mb-1">Who can see my Last Seen?</label>
                <select value={privacyLastSeen} onChange={(e) => setPrivacyLastSeen(e.target.value)}
                  className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500">
                  <option value="everyone">Everyone</option>
                  <option value="contacts">Contacts Only</option>
                  <option value="nobody">Nobody</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-white/50 block mb-1">Who can see my Profile Info?</label>
                <select value={privacyProfile} onChange={(e) => setPrivacyProfile(e.target.value)}
                  className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500">
                  <option value="everyone">Everyone</option>
                  <option value="contacts">Contacts Only</option>
                  <option value="nobody">Nobody</option>
                </select>
              </div>

              <div className="flex items-center justify-between bg-white/3 p-3 rounded-xl border border-white/5">
                <div>
                  <div className="text-xs font-semibold text-white">Read Receipts</div>
                  <div className="text-[11px] text-white/40">Show double blue ticks when you read messages</div>
                </div>
                <input type="checkbox" checked={readReceipts} onChange={(e) => setReadReceipts(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500 cursor-pointer" />
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between bg-white/3 p-3 rounded-xl border border-white/5">
                <div>
                  <div className="text-xs font-semibold text-white">Two-Factor Authentication</div>
                  <div className="text-[11px] text-white/40">{twoFactorEnabled ? '2FA is active' : 'Add extra account protection'}</div>
                </div>
                {twoFactorEnabled ? (
                  <button onClick={handleDisable2FA} className="text-xs bg-red-500/20 text-red-400 px-3 py-1 rounded-lg border border-red-500/30">
                    Disable 2FA
                  </button>
                ) : (
                  <button onClick={handleStart2FASetup} className="text-xs bg-indigo-500 text-white px-3 py-1 rounded-lg font-bold">
                    Enable 2FA
                  </button>
                )}
              </div>

              {qrCodeUrl && (
                <div className="flex flex-col items-center gap-2 bg-[#1a1a24] p-3 rounded-xl border border-white/10">
                  <span className="text-xs text-white/60">Scan QR Code with Authenticator App:</span>
                  <img src={qrCodeUrl} alt="QR Code" className="w-32 h-32 rounded-lg bg-white p-1" />
                  <span className="text-[10px] font-mono text-indigo-300">Secret: {twoFactorSecret}</span>
                  <input type="text" maxLength={6} placeholder="Enter 6-digit code" value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 text-center text-xs text-white py-1.5 rounded-lg outline-none" />
                  <button onClick={handleVerify2FA} className="w-full bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold py-1.5 rounded-lg">
                    Verify & Enable 2FA
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs text-white/50 hover:text-white transition">Close</button>
          {activeTab !== 'security' && (
            <button onClick={handleSaveProfile} className="px-5 py-2 text-xs bg-indigo-500 hover:bg-indigo-400 font-bold text-white rounded-xl transition shadow-lg shadow-indigo-500/25">
              Save Changes
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
