export default function Avatar({ username, color, avatarEmoji, size = 32 }) {
  const isUrl = avatarEmoji && (avatarEmoji.startsWith('http://') || avatarEmoji.startsWith('https://'))

  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white uppercase shrink-0 select-none shadow-sm overflow-hidden"
      style={{ width: size, height: size, background: isUrl ? 'transparent' : (color || '#6366f1'), fontSize: size * 0.42 }}
    >
      {isUrl ? (
        <img src={avatarEmoji} alt={username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      ) : avatarEmoji ? (
        avatarEmoji
      ) : (
        username?.charAt(0)
      )}
    </div>
  )
}
