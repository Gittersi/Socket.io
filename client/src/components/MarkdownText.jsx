import React from 'react'

export default function MarkdownText({ content }) {
  if (!content) return null

  // Function to parse basic markdown elements (bold, italic, inline code, links)
  const parseMarkdown = (text) => {
    // Escape HTML tags to prevent XSS
    const safeText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    // Split text by code blocks ```code```
    const parts = safeText.split(/(```[\s\S]*?```)/g)

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const codeContent = part.slice(3, -3).trim()
        return (
          <pre key={index} className="bg-black/40 border border-white/10 rounded-lg p-2.5 my-1.5 font-mono text-xs overflow-x-auto text-emerald-300">
            <code>{codeContent}</code>
          </pre>
        )
      }

      // Format inline elements: **bold**, *italic*, `code`, URLs
      let formatted = part
        // Bold: **text**
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
        // Italic: *text*
        .replace(/\*(.*?)\*/g, '<em class="italic text-indigo-200">$1</em>')
        // Inline code: `code`
        .replace(/`(.*?)`/g, '<code class="bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono text-pink-300">$1</code>')
        // Links: https://...
        .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-indigo-400 underline hover:text-indigo-300 break-all">$1</a>')

      return <span key={index} dangerouslySetInnerHTML={{ __html: formatted }} />
    })
  }

  return <div className="leading-relaxed inline">{parseMarkdown(content)}</div>
}
