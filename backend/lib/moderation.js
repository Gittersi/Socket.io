// Content moderation & profanity filtering logic

const BAD_WORDS = [
  'spam', 'scam', 'phishing', 'hate', 'abuse', 'offensive', 'badword1', 'badword2'
]

export const reportedMessages = []

export function moderateText(text) {
  if (!text) return { text: '', isFlagged: false, reasons: [] }

  let cleanText = text
  let isFlagged = false
  const reasons = []

  // Check bad words
  const words = text.split(/\s+/)
  words.forEach((w) => {
    const cleanW = w.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (BAD_WORDS.includes(cleanW)) {
      isFlagged = true
      reasons.push(`Inappropriate word: "${cleanW}"`)
      // Censor word
      const regex = new RegExp(cleanW, 'gi')
      cleanText = cleanText.replace(regex, '****')
    }
  })

  // Check spam repetition
  if (/(.)\1{19,}/.test(text)) {
    isFlagged = true
    reasons.push('Excessive character repetition (Spam)')
  }

  return { text: cleanText, isFlagged, reasons }
}

export function reportMessage({ msgId, roomId, reportedBy, reason, msgText, username }) {
  const report = {
    id: 'rep_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    msgId,
    roomId,
    reportedBy,
    reason: reason || 'Inappropriate content',
    msgText,
    username,
    createdAt: new Date().toISOString(),
    status: 'pending'
  }
  reportedMessages.unshift(report)
  if (reportedMessages.length > 100) reportedMessages.pop()
  return report
}
