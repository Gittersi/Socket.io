export default function Avatar({ username, color, size = 32 }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white uppercase shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}
    >
      {username?.charAt(0)}
    </div>
  )
}
