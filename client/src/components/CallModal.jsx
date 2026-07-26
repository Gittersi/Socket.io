import React, { useState, useEffect, useRef } from 'react'
import socket from '../lib/socket'

export default function CallModal({ callData, onEndCall }) {
  const { isIncoming, fromUser, targetUser, isVideo, offer, roomId } = callData

  const [callState, setCallState] = useState(isIncoming ? 'incoming' : 'calling') // 'incoming' | 'calling' | 'connected'
  const [micMuted, setMicMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [callDuration, setCallDuration] = useState(0)

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const peerConnectionRef = useRef(null)
  const localStreamRef = useRef(null)
  const timerRef = useRef(null)

  const peerConfiguration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  }

  const peerUser = isIncoming ? fromUser : targetUser

  useEffect(() => {
    // Listen for WebRTC signals from remote peer
    socket.on('callAnswered', async ({ answer }) => {
      if (peerConnectionRef.current && answer) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer))
        setCallState('connected')
        startTimer()
      }
    })

    socket.on('iceCandidate', async ({ candidate }) => {
      if (peerConnectionRef.current && candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (e) {}
      }
    })

    socket.on('callRejected', () => {
      alert(`${peerUser?.username} rejected the call.`)
      cleanupAndExit()
    })

    socket.on('callEnded', () => {
      cleanupAndExit()
    })

    if (!isIncoming) {
      initiateOutgoingCall()
    }

    return () => {
      socket.off('callAnswered')
      socket.off('iceCandidate')
      socket.off('callRejected')
      socket.off('callEnded')
      cleanup()
    }
  }, [])

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setCallDuration((d) => d + 1)
    }, 1000)
  }

  const initiateOutgoingCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideo,
        audio: true
      })
      localStreamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream

      const pc = new RTCPeerConnection(peerConfiguration)
      peerConnectionRef.current = pc

      stream.getTracks().forEach((track) => pc.addTrack(track, stream))

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0]
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && peerUser) {
          socket.emit('iceCandidate', { targetUserId: peerUser.id, candidate: event.candidate })
        }
      }

      const offerSDP = await pc.createOffer()
      await pc.setLocalDescription(offerSDP)

      socket.emit('callUser', {
        targetUserId: peerUser.id,
        roomId,
        isVideo,
        offer: offerSDP
      })
    } catch (err) {
      alert('Could not start video/audio call: ' + err.message)
      onEndCall()
    }
  }

  const handleAcceptIncomingCall = async () => {
    try {
      setCallState('connected')
      startTimer()

      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideo,
        audio: true
      })
      localStreamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream

      const pc = new RTCPeerConnection(peerConfiguration)
      peerConnectionRef.current = pc

      stream.getTracks().forEach((track) => pc.addTrack(track, stream))

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0]
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && peerUser) {
          socket.emit('iceCandidate', { targetUserId: peerUser.id, candidate: event.candidate })
        }
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      const answerSDP = await pc.createAnswer()
      await pc.setLocalDescription(answerSDP)

      socket.emit('answerCall', {
        targetUserId: peerUser.id,
        answer: answerSDP
      })
    } catch (err) {
      alert('Could not connect call: ' + err.message)
      cleanupAndExit()
    }
  }

  const handleRejectCall = () => {
    if (peerUser) socket.emit('rejectCall', { targetUserId: peerUser.id })
    cleanupAndExit()
  }

  const handleHangup = () => {
    if (peerUser) socket.emit('endCall', { targetUserId: peerUser.id })
    cleanupAndExit()
  }

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setMicMuted(!audioTrack.enabled)
      }
    }
  }

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setCameraOff(!videoTrack.enabled)
      }
    }
  }

  const handleToggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        const screenTrack = screenStream.getVideoTracks()[0]

        if (peerConnectionRef.current) {
          const sender = peerConnectionRef.current.getSenders().find((s) => s.track.kind === 'video')
          if (sender) sender.replaceTrack(screenTrack)
        }

        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream

        screenTrack.onended = () => {
          stopScreenShare()
        }
        setIsScreenSharing(true)
      } else {
        stopScreenShare()
      }
    } catch (e) {}
  }

  const stopScreenShare = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (peerConnectionRef.current && videoTrack) {
        const sender = peerConnectionRef.current.getSenders().find((s) => s.track.kind === 'video')
        if (sender) sender.replaceTrack(videoTrack)
      }
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current
    }
    setIsScreenSharing(false)
  }

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }
  }

  const cleanupAndExit = () => {
    cleanup()
    onEndCall()
  }

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-6">
      {/* Top Bar */}
      <div className="w-full max-w-4xl flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-lg">
            {isVideo ? '📹' : '📞'}
          </div>
          <div>
            <div className="text-base font-bold text-white">{peerUser?.username || 'User'}</div>
            <div className="text-xs text-white/50">
              {callState === 'connected' ? `In Call · ${formatDuration(callDuration)}` : callState === 'incoming' ? 'Incoming call…' : 'Ringing…'}
            </div>
          </div>
        </div>
      </div>

      {/* Video Streams Container */}
      <div className="w-full max-w-4xl flex-1 relative my-4 bg-black/50 border border-white/10 rounded-3xl overflow-hidden flex items-center justify-center">
        {/* Remote Video */}
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />

        {/* Local Video Overlay */}
        <div className="absolute bottom-4 right-4 w-44 h-32 bg-gray-900 border border-white/20 rounded-2xl overflow-hidden shadow-2xl z-20">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        </div>

        {/* Placeholder when no video feed */}
        {(!isVideo || cameraOff) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-indigo-950/60 to-black">
            <div className="w-24 h-24 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-4xl font-bold mb-3 animate-pulse">
              {peerUser?.username?.[0]?.toUpperCase() || '👤'}
            </div>
            <div className="text-lg font-bold text-white">{peerUser?.username}</div>
            <div className="text-xs text-white/40">{isVideo ? 'Camera is off' : 'Audio Call active'}</div>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="flex items-center gap-4 z-10 bg-[#13131a] border border-white/10 px-6 py-3 rounded-full shadow-2xl">
        {callState === 'incoming' ? (
          <>
            <button onClick={handleAcceptIncomingCall}
              className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center text-xl transition font-bold shadow-lg shadow-emerald-500/30">
              📞
            </button>
            <button onClick={handleRejectCall}
              className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center text-xl transition font-bold shadow-lg shadow-red-500/30">
              📵
            </button>
          </>
        ) : (
          <>
            <button onClick={toggleMic} title="Mute Mic"
              className={`w-11 h-11 rounded-full flex items-center justify-center text-lg transition ${
                micMuted ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}>
              {micMuted ? '🎙️❌' : '🎙️'}
            </button>

            {isVideo && (
              <button onClick={toggleCamera} title="Toggle Camera"
                className={`w-11 h-11 rounded-full flex items-center justify-center text-lg transition ${
                  cameraOff ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-white/10 hover:bg-white/20 text-white'
                }`}>
                {cameraOff ? '📹❌' : '📹'}
              </button>
            )}

            <button onClick={handleToggleScreenShare} title="Screen Share"
              className={`w-11 h-11 rounded-full flex items-center justify-center text-lg transition ${
                isScreenSharing ? 'bg-indigo-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}>
              💻
            </button>

            <button onClick={handleHangup} title="End Call"
              className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center text-xl transition font-bold shadow-lg shadow-red-500/30">
              📵
            </button>
          </>
        )}
      </div>
    </div>
  )
}
