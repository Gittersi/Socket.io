import React from 'react'

export default function LinkPreview({ text }) {
  if (!text) return null
  const urlMatch = text.match(/(https?:\/\/[^\s<]+)/i)
  if (!urlMatch) return null

  const url = urlMatch[0]
  let domain = ''
  try {
    domain = new URL(url).hostname.replace('www.', '')
  } catch {
    domain = url
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="mt-2 block bg-black/30 border border-white/10 hover:border-indigo-500/40 rounded-xl p-2.5 transition group">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold text-indigo-400 group-hover:underline flex items-center gap-1">
          🔗 {domain}
        </span>
      </div>
      <div className="text-xs text-white/80 font-medium truncate">{url}</div>
      <div className="text-[11px] text-white/40 mt-0.5">Click to preview external web link</div>
    </a>
  )
}
