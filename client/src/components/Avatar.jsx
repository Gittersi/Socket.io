export default function Avatar({ username, color, avatarEmoji, size = 32 }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white uppercase shrink-0 select-none shadow-sm"
      style={{ width: size, height: size, background: color || '#6366f1', fontSize: size * 0.42 }}
    >
      {avatarEmoji ? avatarEmoji : username?.charAt(0)}
    </div>
  )
}
