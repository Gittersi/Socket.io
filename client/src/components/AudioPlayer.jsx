import React, { useState, useRef, useEffect } from 'react'

export default function AudioPlayer({ src }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleLoadedMetadata = () => setDuration(audio.duration || 0)
    const handleEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [src])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const formatTime = (secs) => {
    if (isNaN(secs) || secs === 0) return '0:00'
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="flex items-center gap-3 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl px-3 py-2 my-1 max-w-[240px]">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button onClick={togglePlay}
        className="w-8 h-8 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white flex items-center justify-center transition shrink-0 text-sm">
        {isPlaying ? '⏸' : '▶'}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        {/* Animated simulated waveform bars */}
        <div className="flex items-center gap-0.5 h-5">
          {[40, 70, 30, 90, 60, 100, 45, 80, 50, 75, 35, 95, 60, 85, 40].map((h, i) => (
            <div key={i}
              className={`w-1 rounded-full transition-all duration-200 ${
                (i / 15) * 100 <= progress ? 'bg-indigo-400' : 'bg-white/20'
              }`}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>

        <div className="flex justify-between text-[10px] text-white/50">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  )
}
