import React, { useState, useRef, useEffect } from 'react'

export default function VoiceRecorder({ onSendVoice, onCancel }) {
  const [isRecording, setIsRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const timerRef = useRef(null)

  useEffect(() => {
    startRecording()
    return () => {
      stopTimer()
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)

      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1)
      }, 1000)
    } catch (err) {
      alert('Could not access microphone: ' + err.message)
      onCancel()
    }
  }

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const handleStopAndSend = () => {
    stopTimer()
    if (!mediaRecorderRef.current) return

    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      const reader = new FileReader()
      reader.onloadend = () => {
        onSendVoice(reader.result)
      }
      reader.readAsDataURL(audioBlob)

      // Stop mic track
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop())
    }

    mediaRecorderRef.current.stop()
  }

  const handleCancelRecording = () => {
    stopTimer()
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop())
    }
    onCancel()
  }

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <div className="flex items-center gap-3 bg-red-950/40 border border-red-500/30 rounded-xl px-3 py-2 animate-pulse">
      <div className="w-3 h-3 rounded-full bg-red-500 animate-ping shrink-0" />
      <span className="text-xs font-mono text-red-300 font-bold">{formatTime(seconds)}</span>
      <span className="text-xs text-white/60">Recording voice message…</span>

      <div className="flex items-center gap-2 ml-auto">
        <button onClick={handleCancelRecording}
          className="text-xs text-white/40 hover:text-white px-2 py-1 transition">
          Cancel
        </button>
        <button onClick={handleStopAndSend}
          className="bg-red-500 hover:bg-red-400 text-white rounded-lg px-3 py-1 text-xs font-semibold transition">
          Send Voice 🎙️
        </button>
      </div>
    </div>
  )
}
