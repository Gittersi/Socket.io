import { users } from '../lib/store.js'

export function registerCallHandlers(io, socket) {
  const currentUser = socket.data.user
  if (!currentUser) return

  // Initiate call
  socket.on('callUser', ({ targetUserId, roomId, isVideo, offer }) => {
    // Find socketId for target user
    for (const [sid, user] of users.entries()) {
      if (user.id === targetUserId) {
        io.to(sid).emit('incomingCall', {
          fromUser: currentUser,
          roomId,
          isVideo: !!isVideo,
          offer
        })
      }
    }
  })

  // Answer call
  socket.on('answerCall', ({ targetUserId, answer }) => {
    for (const [sid, user] of users.entries()) {
      if (user.id === targetUserId) {
        io.to(sid).emit('callAnswered', {
          fromUser: currentUser,
          answer
        })
      }
    }
  })

  // Exchange WebRTC ICE candidate
  socket.on('iceCandidate', ({ targetUserId, candidate }) => {
    for (const [sid, user] of users.entries()) {
      if (user.id === targetUserId) {
        io.to(sid).emit('iceCandidate', {
          fromUserId: currentUser.id,
          candidate
        })
      }
    }
  })

  // Reject incoming call
  socket.on('rejectCall', ({ targetUserId }) => {
    for (const [sid, user] of users.entries()) {
      if (user.id === targetUserId) {
        io.to(sid).emit('callRejected', {
          fromUserId: currentUser.id,
          username: currentUser.username
        })
      }
    }
  })

  // End active call
  socket.on('endCall', ({ targetUserId }) => {
    for (const [sid, user] of users.entries()) {
      if (user.id === targetUserId) {
        io.to(sid).emit('callEnded', {
          fromUserId: currentUser.id
        })
      }
    }
  })
}
