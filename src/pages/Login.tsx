import React, { useState } from 'react'
import {
  Box, Button, InputAdornment, TextField, Typography,
  Paper, CircularProgress, Alert, FormControlLabel, Checkbox
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import LockPersonIcon from '@mui/icons-material/LockPerson'
import { loginUser, OWNER_USERNAMES } from '../auth'

interface LoginProps { onLogin: (opts?: { username?: string }) => void }

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isHuman, setIsHuman] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [info, setInfo] = useState('')

  const normalizedUsername = username.trim().toLowerCase()
  const isOwner = OWNER_USERNAMES.includes(normalizedUsername)
  const usernameHasInput = normalizedUsername.length > 0

  // Username validation: Owners (ashfaq001, rizlan12) are valid; others must have min 3 chars AND at least 1 number (e.g. lobby02, lobby001, lobby3)
  const isUsernameValid = usernameHasInput && (
    isOwner || (normalizedUsername.length >= 3 && /\d/.test(normalizedUsername))
  )

  const handleLogin = async () => {
    if (!normalizedUsername) return setError('Enter your username')
    if (!isUsernameValid) {
      return setError('Username must include at least one number (e.g. lobby02, lobby001, lobby3)')
    }
    if (password.length < 6) return setError('Password must be at least 6 characters')
    if (!isHuman) return setError('Please tick "I am human" verification box')

    setLoading(true)
    setError('')
    setInfo('')

    try {
      const result = await loginUser(normalizedUsername, password)
      if (result.ok) {
        if (result.firstTime) {
          setInfo('Account created! Logging you in...')
        }
        onLogin({ username: normalizedUsername })
      } else {
        setError(result.error || 'Login failed')
      }
    } catch (e: any) {
      setError(e.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) handleLogin()
  }

  return (
    <Box className="center-screen">
      <Paper elevation={6} className="login-card" sx={{ bgcolor: 'background.paper' }}>
        {/* Logo / Brand */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: 'gradient(135deg,#34d399,#059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(52,211,153,0.35)',
            bgcolor: '#34d399'
          }}>
            <LockPersonIcon sx={{ color: '#021202', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              Play with Peruim
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
              Inventory Management System
            </Typography>
          </Box>
        </Box>

        <Typography variant="body2" sx={{ mt: 2, mb: 3, color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', lineHeight: 1.6 }}>
          Enter your username and password to log in or join. All edits sync in real time.
        </Typography>

        <TextField
          label="Username"
          fullWidth
          value={username}
          onChange={e => { setUsername(e.target.value); setError('') }}
          onKeyDown={handleKeyDown}
          margin="normal"
          autoFocus
          disabled={loading}
          helperText={
            usernameHasInput && !isUsernameValid
              ? 'Username must contain a number (e.g. lobby02, lobby001, lobby3)'
              : 'Include numbers for viewer/editor accounts (e.g. lobby02, lobby3)'
          }
          FormHelperTextProps={{
            sx: { color: usernameHasInput && !isUsernameValid ? '#fb7185' : 'rgba(255,255,255,0.45)' }
          }}
          InputProps={{
            endAdornment: usernameHasInput ? (
              <InputAdornment position="end">
                {isUsernameValid ? (
                  <CheckCircleIcon sx={{ color: '#4ade80', fontSize: 22 }} />
                ) : (
                  <CancelIcon sx={{ color: '#fb7185', fontSize: 22 }} />
                )}
              </InputAdornment>
            ) : undefined
          }}
        />

        <TextField
          label="Password"
          type="password"
          fullWidth
          value={password}
          onChange={e => { setPassword(e.target.value); setError('') }}
          onKeyDown={handleKeyDown}
          margin="normal"
          disabled={loading}
          helperText="New user? Entering a password (6+ chars) automatically registers your account."
        />

        {/* Simple "I am human" verification checkbox */}
        <Box sx={{
          mt: 2,
          p: 1.5,
          borderRadius: 2,
          border: isHuman ? '1px solid rgba(74,222,128,0.4)' : '1px solid rgba(255,255,255,0.12)',
          bgcolor: isHuman ? 'rgba(74,222,128,0.06)' : 'rgba(255,255,255,0.02)',
          display: 'flex',
          alignItems: 'center',
          transition: 'all 0.2s ease'
        }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={isHuman}
                onChange={e => { setIsHuman(e.target.checked); setError('') }}
                sx={{
                  color: 'rgba(255,255,255,0.5)',
                  '&.Mui-checked': { color: '#4ade80' }
                }}
              />
            }
            label={
              <Typography variant="body2" sx={{ fontWeight: 600, color: isHuman ? '#4ade80' : 'rgba(255,255,255,0.85)' }}>
                I am human
              </Typography>
            }
            sx={{ m: 0, width: '100%' }}
          />
        </Box>

        {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
        {info && <Alert severity="success" sx={{ mt: 1.5 }}>{info}</Alert>}

        <Button
          variant="contained"
          onClick={handleLogin}
          sx={{ mt: 3 }}
          className="primary-cta"
          fullWidth
          disabled={loading || !isUsernameValid || password.length < 6 || !isHuman}
          startIcon={loading ? <CircularProgress size={18} sx={{ color: '#021202' }} /> : null}
        >
          {loading ? 'Processing...' : 'Login / Create Account'}
        </Button>
      </Paper>
    </Box>
  )
}
