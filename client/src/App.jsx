import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/useAuthStore'
import { useSocket }    from './hooks/useSocket'
import LoginPage    from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import LobbyPage    from './pages/LobbyPage'
import ChatPage     from './pages/ChatPage'
import AuthCallback from './pages/AuthCallback'

function PrivateRoute({ children }) {
  const { user, accessToken } = useAuthStore()
  if (!user || !accessToken) return <Navigate to="/login" replace />
  return children
}

function GuestRoute({ children }) {
  const { user, accessToken } = useAuthStore()
  if (user && accessToken) return <Navigate to="/" replace />
  return children
}

export default function App() {
  // Connect socket for authenticated users
  useSocket()

  return (
    <div className="h-full">
      <Routes>
        <Route path="/login"    element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/"         element={<PrivateRoute><LobbyPage /></PrivateRoute>} />
        <Route path="/chat/:roomId" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
        <Route path="*"         element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
