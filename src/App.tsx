import React, { useState, useEffect, useRef } from 'react'
import { Box, CircularProgress } from '@mui/material'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import { onAuthStateChanged, logoutUser, subscribeForceLogout } from './auth'

export default function App(): JSX.Element {
  const [authState, setAuthState] = useState<'loading' | 'authed' | 'unauthed'>('loading')
  const [user, setUser] = useState<string | null>(null)
  const [loginTime, setLoginTime] = useState<string | null>(null)
  const userRef = useRef<string | null>(null)
  userRef.current = user

  useEffect(() => {
    // Firebase keeps session alive across devices/tabs/refreshes
    const unsub = onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        const username = (firebaseUser.email?.split('@')[0] || '').toLowerCase()
        setUser(username)
        setLoginTime(firebaseUser.metadata.lastSignInTime || new Date().toISOString())
        setAuthState('authed')
      } else {
        setUser(null)
        setAuthState('unauthed')
      }
    })
    return unsub
  }, [])

  // Real-time force logout listener (when rizlan12 updates system password)
  useEffect(() => {
    const unsub = subscribeForceLogout((logoutTimeStr) => {
      const currentUser = (userRef.current || '').toLowerCase()
      if (!currentUser) return

      // CRITICAL RULE: ashfaq001 is NEVER logged out!
      if (currentUser === 'ashfaq001') {
        console.log('[Auth] Force logout signal ignored for ashfaq001.')
        return
      }

      // rizlan12 is the admin updating the password, so rizlan12 stays logged in
      if (currentUser === 'rizlan12') {
        console.log('[Auth] Force logout signal ignored for rizlan12.')
        return
      }

      // ALL OTHER accounts get logged out in real-time instantly!
      console.log(`[Auth] Force logging out ${currentUser} due to admin password change at ${logoutTimeStr}`)
      logoutUser().then(() => {
        setUser(null)
        setAuthState('unauthed')
      }).catch(console.error)
    })

    return unsub
  }, [])

  const handleLogin = (opts?: { username?: string }) => {
    if (opts?.username) setUser(opts.username.toLowerCase())
    setLoginTime(new Date().toISOString())
    setAuthState('authed')
  }

  const handleLogout = async () => {
    await logoutUser()
    setUser(null)
    setAuthState('unauthed')
  }

  if (authState === 'loading') {
    return (
      <Box sx={{
        minHeight: '100vh',
        bgcolor: '#050a12',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2
      }}>
        <CircularProgress sx={{ color: '#4ade80' }} />
      </Box>
    )
  }

  return authState === 'authed' ? (
    <Dashboard onLogout={handleLogout} loginTime={loginTime} user={user} />
  ) : (
    <Login onLogin={handleLogin} />
  )
}
