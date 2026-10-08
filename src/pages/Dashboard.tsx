import React, { useState, useEffect } from 'react'
import {
  Box, AppBar, Toolbar, Typography, Button, Container, Paper,
  TextField, CircularProgress, Modal, IconButton, Alert, Snackbar,
  Select, MenuItem, Chip, Divider, InputLabel, FormControl, Dialog, DialogTitle, DialogContent, DialogActions,
  Drawer, List, ListItem, ListItemText, Tooltip
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import GroupIcon from '@mui/icons-material/Group'
import CircleIcon from '@mui/icons-material/Circle'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import VpnKeyIcon from '@mui/icons-material/VpnKey'
import HistoryIcon from '@mui/icons-material/History'
import RestoreIcon from '@mui/icons-material/Restore'
import InventoryTable, { playAlertSound } from '../components/InventoryTable'
import AddProductModal from '../components/AddProductModal'
import api, {
  scheduleHistorySnapshot,
  subscribeInventoryHistory,
  clearInventoryHistory,
  restoreInventoryFromSnapshot,
  type InventoryHistoryEntry,
  getSeedProducts
} from '../api'
import { addUserToFirestore, subscribeUsers, OWNER_USERNAMES, changeUserPasswordWithCurrent } from '../auth'

interface DashboardProps { onLogout: () => void; loginTime: string | null; user: string | null }

export default function Dashboard({ onLogout, loginTime, user }: DashboardProps) {
  const [products, setProducts] = useState<any[]>([])
  const [openAdd, setOpenAdd] = useState(false)
  const [loading, setLoading] = useState(true)
  const [inventoryError, setInventoryError] = useState('')
  const [showUserMgmt, setShowUserMgmt] = useState(false)
  const [adminAlertOpen, setAdminAlertOpen] = useState(false)
  const [usersList, setUsersList] = useState<any[]>([])
  const [newUsername, setNewUsername] = useState('')
  const [newUserRole, setNewUserRole] = useState<'editor' | 'viewer'>('editor')
  const [userMgmtMsg, setUserMgmtMsg] = useState('')
  const [userMgmtErr, setUserMgmtErr] = useState('')
  const [userMgmtLoading, setUserMgmtLoading] = useState(false)

  // Change Password Modal State (Instagram-style identity verification)
  const [showPassModal, setShowPassModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passLoading, setPassLoading] = useState(false)
  const [passMsg, setPassMsg] = useState('')
  const [passErr, setPassErr] = useState('')
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false)
  const [historyList, setHistoryList] = useState<InventoryHistoryEntry[]>([])
  const [selectedSnapshot, setSelectedSnapshot] = useState<InventoryHistoryEntry | null>(null)
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false)
  const [restoreLoading, setRestoreLoading] = useState(false)
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState('')
  const [clearHistoryConfirmOpen, setClearHistoryConfirmOpen] = useState(false)
  const [clearHistoryLoading, setClearHistoryLoading] = useState(false)

  const normalizedUser = (user || '').toLowerCase()
  const isOwner = OWNER_USERNAMES.includes(normalizedUser)
  const inventoryName = 'PLAY WITH PERUIM — INVENTORY'

  // Real-time sync setup: seed once then subscribe
  useEffect(() => {
    let unsub: (() => void) | null = null

    const init = async () => {
      setLoading(true)
      try {
        await api.seedIfEmpty()
      } catch (e) {
        console.error('[Dashboard] Seed error:', e)
      }
      unsub = api.subscribeProducts(prods => {
        // If there are pending local updates that Firestore has not acknowledged yet, preserve them
        if (pendingUpdatesRef.current.size > 0) {
          const merged = prods.map(prod => {
            let modifiedSizes: Record<string, number> | null = null
            for (const [key, pendingVal] of pendingUpdatesRef.current.entries()) {
              const [id, size] = key.split('_')
              if (prod.id === id) {
                if (!modifiedSizes) modifiedSizes = { ...(prod.sizes || {}) }
                modifiedSizes![size] = pendingVal
              }
            }
            return modifiedSizes ? { ...prod, sizes: modifiedSizes } : prod
          })
          setProducts(merged)
        } else {
          setProducts(prods)
        }
        setLoading(false)
        setInventoryError('')
      }, error => {
        console.error('[Dashboard] Inventory subscription error:', error)
        const fallbackProducts = getSeedProducts().map((product, index) => ({
          ...product,
          id: `local-${index + 1}`
        }))
        setProducts(fallbackProducts)
        setInventoryError('Cloud inventory is unavailable. Showing the default inventory until Firebase access is restored.')
        setLoading(false)
      })
    }

    init().catch(console.error)
    return () => { if (unsub) unsub() }
  }, [])

  // Real-time users listener for owners
  useEffect(() => {
    if (!isOwner) return
    const unsub = subscribeUsers(u => {
      setUsersList(u)
    })
    return () => unsub()
  }, [isOwner])

  // Real-time history snapshots listener for owners
  useEffect(() => {
    if (!isOwner || !showHistoryDrawer) return
    const unsub = subscribeInventoryHistory(list => {
      setHistoryList(list)
    })
    return () => unsub()
  }, [isOwner, showHistoryDrawer])

  // Handlers — state auto-updates via real-time listener
  const handleAdd = async (p: any) => {
    if (!isOwner) {
      playAlertSound()
      setAdminAlertOpen(true)
      return
    }
    setOpenAdd(false)
    const newProd = await api.addProductApi(p).catch(console.error)
    if (newProd) {
      scheduleHistorySnapshot([...products, newProd], user || 'admin', `Added product "${p.name}"`)
    }
  }

  const handleOpenAddModal = () => {
    setOpenAdd(true)
  }

  // Handle password change with current password verification (Instagram style)
  const handleChangePassword = async () => {
    if (!currentPassword) return setPassErr('Please enter your current password.')
    if (newPassword.length < 6) return setPassErr('New password must be at least 6 characters.')
    setPassErr('')
    setPassMsg('')
    setPassLoading(true)

    try {
      const res = await changeUserPasswordWithCurrent(currentPassword, newPassword)
      if (res.ok) {
        if (normalizedUser === 'rizlan12') {
          setPassMsg('✓ Password updated! All employee & viewer sessions have been logged out in real-time. ashfaq001 remains logged in.')
        } else {
          setPassMsg('✓ Password updated successfully!')
        }
        setCurrentPassword('')
        setNewPassword('')
      } else {
        setPassErr(res.error || 'Failed to update password.')
      }
    } catch (e: any) {
      setPassErr(e.message || 'Error updating password.')
    } finally {
      setPassLoading(false)
    }
  }

  // Track pending optimistic size edits to prevent onSnapshot race conditions
  const pendingUpdatesRef = React.useRef<Map<string, number>>(new Map())

  // Robust atomic update for quantity + snapshot record
  const handleUpdateQty = (id: string, size: string, deltaOrQty: number, isDelta = false) => {
    if (!isOwner) return

    // 1. Calculate the latest value synchronously using current state
    const currentProd = products.find((p: any) => p.id === id)
    const currentQty = Number(currentProd?.sizes?.[size]) || 0
    const finalQty = isDelta ? Math.max(0, currentQty + deltaOrQty) : Math.max(0, deltaOrQty)

    // 2. Mark this key as pending so fast snapshot echoes don't overwrite it
    const updateKey = `${id}_${size}`
    pendingUpdatesRef.current.set(updateKey, finalQty)

    // 3. Immediately update UI state
    setProducts(prev => {
      const updatedProducts = prev.map((p: any) => {
        if (p.id !== id) return p
        const newSizes = { ...(p.sizes || {}), [size]: finalQty }
        return { ...p, sizes: newSizes }
      })
      const target = prev.find((p: any) => p.id === id)
      scheduleHistorySnapshot(
        updatedProducts,
        user || 'admin',
        `Updated ${target?.name || 'product'} (${size}: ${finalQty})`
      )
      return updatedProducts
    })

    // 4. Sync exact calculated finalQty to Firestore
    api.updateProductSizes(id, { [size]: finalQty }, true)
      .catch(console.error)
      .finally(() => {
        // Clear pending mark after a short grace period
        setTimeout(() => {
          if (pendingUpdatesRef.current.get(updateKey) === finalQty) {
            pendingUpdatesRef.current.delete(updateKey)
          }
        }, 1500)
      })
  }

  // Optimistic rename + snapshot record
  const handleRename = async (id: string, name: string) => {
    if (!isOwner) return
    if (!name.trim()) return
    const cleanName = name.trim()
    const updatedProducts = products.map((p: any) => p.id === id ? { ...p, name: cleanName } : p)
    setProducts(updatedProducts)
    await api.updateProductName(id, cleanName).catch(console.error)
    scheduleHistorySnapshot(updatedProducts, user || 'admin', `Renamed product to "${cleanName}"`)
  }

  // Optimistic image update
  const handleUpdateImage = async (id: string, image: string) => {
    if (!isOwner) return
    const updatedProducts = products.map((p: any) => p.id === id ? { ...p, image } : p)
    setProducts(updatedProducts)
    await api.updateProductImage(id, image).catch(console.error)
    scheduleHistorySnapshot(updatedProducts, user || 'admin', `Updated image for product`)
  }

  // Optimistic delete + snapshot record
  const handleDelete = async (id: string) => {
    if (!isOwner) return
    const target = products.find(p => p.id === id)
    const updatedProducts = products.filter((p: any) => p.id !== id)
    setProducts(updatedProducts)
    await api.deleteProductApi(id).catch(console.error)
    scheduleHistorySnapshot(updatedProducts, user || 'admin', `Deleted product "${target?.name || ''}"`)
  }

  // Handle restoring old historical snapshot
  const handleRestoreSnapshot = async () => {
    if (!selectedSnapshot || !selectedSnapshot.snapshot) return
    setRestoreLoading(true)
    try {
      await restoreInventoryFromSnapshot(
        selectedSnapshot.snapshot,
        user || 'admin',
        `${selectedSnapshot.dateString} ${selectedSnapshot.timeString}`
      )
      setRestoreSuccessMsg(`✓ Entire inventory restored to snapshot from ${selectedSnapshot.dateString} ${selectedSnapshot.timeString}!`)
      setTimeout(() => {
        setRestoreConfirmOpen(false)
        setShowHistoryDrawer(false)
      }, 2000)
      setTimeout(() => setRestoreSuccessMsg(''), 5500)
    } catch (e: any) {
      console.error('[Dashboard] Restore error:', e)
      alert(e.message || 'Failed to restore snapshot.')
    } finally {
      setRestoreLoading(false)
    }
  }

  const handleClearHistory = async () => {
    setClearHistoryLoading(true)
    try {
      await clearInventoryHistory()
      setHistoryList([])
      setClearHistoryConfirmOpen(false)
    } catch (e: any) {
      console.error('[Dashboard] Clear history error:', e)
      alert(e.message || 'Failed to clear edit history.')
    } finally {
      setClearHistoryLoading(false)
    }
  }

  const handleAddUser = async () => {
    if (!newUsername.trim()) return setUserMgmtErr('Enter a username')
    setUserMgmtErr('')
    setUserMgmtMsg('')
    setUserMgmtLoading(true)
    try {
      const result = await addUserToFirestore(newUsername.trim(), newUserRole)
      if (result.ok) {
        setUserMgmtMsg(`✓ "${newUsername.trim()}" added to inventory access list!`)
        setNewUsername('')
      } else {
        setUserMgmtErr(result.error || 'Failed to add user')
      }
    } catch (e: any) {
      setUserMgmtErr(e.message || 'Error adding user')
    } finally {
      setUserMgmtLoading(false)
    }
  }

  const totalItems = products.reduce((sum, item) => {
    return sum + (Object.values(item.sizes || {}) as number[]).reduce((s, v) => s + v, 0)
  }, 0)
  const lowStockCount = products.filter(item => {
    const total = (Object.values(item.sizes || {}) as number[]).reduce((s, v) => s + v, 0)
    return total <= 20
  }).length

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#050a12', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <CircularProgress sx={{ color: '#4ade80' }} size={36} />
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)' }}>
          Syncing cloud inventory…
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#050a12' }}>
      {/* App Bar */}
      <AppBar position="static" className="appbar-accent" sx={{ background: 'linear-gradient(90deg, #111827, #0f172a)' }}>
        <Toolbar sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2, py: 2 }}>
          {/* Left: user info */}
          <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 220 }, display: 'flex', justifyContent: { xs: 'center', sm: 'flex-start' } }}>
            <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>
                  {user || 'Guest'}
                </Typography>
                {isOwner ? (
                  <Chip label="Admin / Owner" size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'rgba(74,222,128,0.18)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.35)' }} />
                ) : (
                  <Chip label="User (View Only)" size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'rgba(251,113,133,0.15)', color: '#fb7185', border: '1px solid rgba(251,113,133,0.3)' }} />
                )}
                <Chip
                  icon={<CircleIcon sx={{ fontSize: '0.55rem !important', color: '#4ade80 !important' }} />}
                  label="Live Sync"
                  size="small"
                  sx={{ height: 18, fontSize: '0.62rem', bgcolor: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}
                />
              </Box>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)' }}>
                Session active since: {loginTime ? new Date(loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
              </Typography>
            </Box>
          </Box>

          {/* Center: title */}
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <Box sx={{ textAlign: 'center', px: 2.5, py: 1, border: '1px solid rgba(255,255,255,0.14)', borderRadius: 999, background: 'rgba(255,255,255,0.05)', boxShadow: '0 8px 24px rgba(0,0,0,0.24)' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Georgia,"Times New Roman",serif', fontStyle: 'italic', color: '#f8fafc', textShadow: '0 0 10px rgba(255,255,255,0.16)', lineHeight: 1.2, fontSize: { xs: '0.85rem', sm: '1.1rem' } }}>
                {inventoryName}
              </Typography>
            </Box>
          </Box>

          {/* Right: actions */}
          <Box sx={{ flex: 1, display: 'flex', justifyContent: { xs: 'center', sm: 'flex-end' }, flexWrap: 'wrap', gap: 1 }}>
            <Button color="inherit" onClick={handleOpenAddModal} sx={{ fontWeight: 600 }}>
              + Add Product
            </Button>

            {/* Change Password button for logged in user */}
            <Button
              color="inherit"
              startIcon={<VpnKeyIcon />}
              onClick={() => {
                if (!isOwner) {
                  playAlertSound()
                  setAdminAlertOpen(true)
                  return
                }
                setShowPassModal(true)
                setPassErr('')
                setPassMsg('')
                setCurrentPassword('')
                setNewPassword('')
              }}
              sx={{ fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}
            >
              Change Password
            </Button>

            {/* Edit History sidebar button for owners */}
            {isOwner && (
              <Button
                color="inherit"
                startIcon={<HistoryIcon sx={{ color: '#38bdf8' }} />}
                onMouseDown={() => setShowHistoryDrawer(true)}
                onClick={() => setShowHistoryDrawer(true)}
                sx={{
                  fontWeight: 700,
                  bgcolor: 'rgba(56,189,248,0.1)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56,189,248,0.25)',
                  '&:hover': { bgcolor: 'rgba(56,189,248,0.2)' }
                }}
              >
                Edit History
              </Button>
            )}

            {isOwner && (
              <Button color="inherit" startIcon={<GroupIcon />} onClick={() => setShowUserMgmt(true)} sx={{ fontWeight: 600 }}>
                User Accounts
              </Button>
            )}
            <Button color="inherit" onClick={onLogout} sx={{ color: 'rgba(255,255,255,0.6)' }}>
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Container - Full Space Coverage */}
      <Container maxWidth={false} sx={{ py: 3, px: { xs: 2, sm: 3, md: 4 } }}>
        {restoreSuccessMsg && (
          <Alert
            severity="success"
            variant="outlined"
            sx={{ mb: 3, bgcolor: 'rgba(74,222,128,0.08)', border: '1px solid #4ade80', color: '#4ade80', fontWeight: 700 }}
          >
            {restoreSuccessMsg}
          </Alert>
        )}
        {inventoryError && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {inventoryError}
          </Alert>
        )}
        {/* Stats */}
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, mb: 3 }}>
          <Paper className="stat-card">
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>Total Products</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>{products.length}</Typography>
          </Paper>
          <Paper className="stat-card">
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>Total Inventory Units</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>{totalItems.toLocaleString()}</Typography>
          </Paper>
          <Paper className="stat-card">
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>Low Stock Items</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: lowStockCount > 0 ? '#facc15' : 'inherit' }}>{lowStockCount}</Typography>
          </Paper>
        </Box>

        {/* Full-width Inventory Table with Admin Access Guard */}
        <InventoryTable
          products={products}
          isOwner={isOwner}
          onUpdateQty={handleUpdateQty}
          onRename={handleRename}
          onDelete={handleDelete}
          onUpdateImage={handleUpdateImage}
        />
      </Container>

      <AddProductModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onAdd={handleAdd}
        isOwner={isOwner}
        onTriggerAlert={() => {
          playAlertSound()
          setAdminAlertOpen(true)
        }}
      />

      {/* ── Change Password Modal (Instagram Style Current Password Check) ── */}
      <Modal open={showPassModal} onClose={() => { setShowPassModal(false); setPassErr(''); setPassMsg('') }}>
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: { xs: '92vw', sm: 460 },
          bgcolor: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 3,
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)', p: 3, outline: 'none'
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
              <VpnKeyIcon sx={{ color: '#38bdf8' }} /> Change Password
            </Typography>
            <IconButton onClick={() => setShowPassModal(false)} sx={{ color: 'rgba(255,255,255,0.6)' }}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 2, lineHeight: 1.6 }}>
            Verify your current password to update your account password.
            {normalizedUser === 'rizlan12' && (
              <Box component="span" sx={{ display: 'block', mt: 1, color: '#facc15', fontWeight: 600 }}>
                ⚠️ Notice: Updating password for <strong>rizlan12</strong> will immediately log out all employee/viewer sessions in real-time. <strong>ashfaq001</strong> will remain logged in.
              </Box>
            )}
          </Typography>

          <TextField
            label="Current Password"
            type="password"
            fullWidth
            value={currentPassword}
            onChange={e => { setCurrentPassword(e.target.value); setPassErr('') }}
            onKeyDown={e => e.key === 'Enter' && !passLoading && handleChangePassword()}
            margin="normal"
            disabled={passLoading}
            autoFocus
            helperText="Enter your existing account password"
          />

          <TextField
            label="New Password"
            type="password"
            fullWidth
            value={newPassword}
            onChange={e => { setNewPassword(e.target.value); setPassErr('') }}
            onKeyDown={e => e.key === 'Enter' && !passLoading && handleChangePassword()}
            margin="normal"
            disabled={passLoading}
            helperText="Minimum 6 characters"
          />

          {passErr && <Alert severity="error" sx={{ mt: 1.5 }}>{passErr}</Alert>}
          {passMsg && <Alert severity="success" sx={{ mt: 1.5 }}>{passMsg}</Alert>}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
            <Button onClick={() => setShowPassModal(false)} sx={{ color: 'rgba(255,255,255,0.6)' }}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleChangePassword}
              disabled={passLoading || !currentPassword || newPassword.length < 6}
              startIcon={passLoading ? <CircularProgress size={16} sx={{ color: '#000' }} /> : <VpnKeyIcon />}
              sx={{ bgcolor: '#38bdf8', color: '#021202', fontWeight: 700, '&:hover': { bgcolor: '#0284c7' } }}
            >
              {passLoading ? 'Verifying...' : 'Update Password'}
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Admin Only Corner Popup Alert with auto-dismiss within 2.5 seconds */}
      <Snackbar
        open={adminAlertOpen}
        autoHideDuration={2500}
        onClose={() => setAdminAlertOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ mt: 2 }}
      >
        <Alert
          onClose={() => setAdminAlertOpen(false)}
          severity="error"
          variant="filled"
          icon={<WarningAmberIcon sx={{ fontSize: 24, color: '#fff' }} />}
          sx={{
            width: '100%',
            maxWidth: 420,
            bgcolor: '#e11d48',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '0.85rem',
            lineHeight: 1.4,
            boxShadow: '0 12px 36px rgba(225, 29, 72, 0.4)',
            borderRadius: 2.5,
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          <strong>Admin Only Access!</strong><br />
          Only Admin accounts (<strong>rizlan12</strong>) are authorized to edit the inventory.
        </Alert>
      </Snackbar>

      {/* ── User Accounts & Logins Admin Panel Modal ── */}
      <Modal open={showUserMgmt} onClose={() => { setShowUserMgmt(false); setUserMgmtMsg(''); setUserMgmtErr('') }}>
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: { xs: '92vw', sm: 540 }, maxHeight: '85vh', overflowY: 'auto',
          bgcolor: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 3,
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)', p: 3, outline: 'none'
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
              <GroupIcon sx={{ color: '#4ade80' }} /> Authorized Users & Active Logins
            </Typography>
            <IconButton onClick={() => setShowUserMgmt(false)} sx={{ color: 'rgba(255,255,255,0.6)' }}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 2.5, lineHeight: 1.6 }}>
            Add and view user accounts with real-time access. All edits made by any authorized user sync instantly.
          </Typography>

          {/* Add user form */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
            <TextField
              size="small"
              label="New username (e.g. lobby02)"
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !userMgmtLoading && handleAddUser()}
              sx={{ flex: '1 1 180px' }}
              disabled={userMgmtLoading}
              helperText="Must include a number (e.g. lobby02, lobby001, lobby3)"
            />
            <FormControl size="small" sx={{ minWidth: 110 }}>
              <InputLabel>Role</InputLabel>
              <Select value={newUserRole} label="Role" onChange={e => setNewUserRole(e.target.value as any)} disabled={userMgmtLoading}>
                <MenuItem value="editor">Editor</MenuItem>
                <MenuItem value="viewer">Viewer</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              onClick={handleAddUser}
              startIcon={userMgmtLoading ? <CircularProgress size={16} sx={{ color: '#021202' }} /> : <PersonAddIcon />}
              disabled={userMgmtLoading || !newUsername.trim()}
              sx={{ background: 'linear-gradient(90deg,#34d399,#22c55e)', color: '#021202', fontWeight: 700, whiteSpace: 'nowrap' }}
            >
              Add User
            </Button>
          </Box>

          {userMgmtErr && <Alert severity="error" sx={{ mb: 1.5 }}>{userMgmtErr}</Alert>}
          {userMgmtMsg && <Alert severity="success" sx={{ mb: 1.5 }}>{userMgmtMsg}</Alert>}

          <Divider sx={{ my: 2.5, borderColor: 'rgba(255,255,255,0.08)' }} />
          <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            User Account List & Recent Activity
          </Typography>

          {/* Display all accounts with online/offline status & last login time */}
          {usersList.map((u: any) => {
            const isCurrentOwner = OWNER_USERNAMES.includes(u.username)
            const isUserOnline = u.isOnline || u.username === user?.toLowerCase()
            const lastLoginText = u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'First login pending'

            return (
              <Box key={u.username} sx={{
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                py: 1.25,
                px: 1.75,
                mb: 1,
                borderRadius: 2,
                bgcolor: isCurrentOwner ? 'rgba(74,222,128,0.06)' : 'rgba(255,255,255,0.03)',
                border: isCurrentOwner ? '1px solid rgba(74,222,128,0.2)' : '1px solid rgba(255,255,255,0.07)'
              }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircleIcon sx={{ fontSize: 10, color: isUserOnline ? '#4ade80' : 'rgba(255,255,255,0.3)' }} />
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#f8fafc' }}>
                      {u.username}
                    </Typography>
                    {isCurrentOwner && (
                      <Chip label="Owner / Admin" size="small" sx={{ bgcolor: 'rgba(74,222,128,0.18)', color: '#4ade80', fontSize: '0.65rem', height: 18, fontWeight: 700 }} />
                    )}
                    {!isCurrentOwner && (
                      <Chip label={u.role || 'user'} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', fontSize: '0.65rem', height: 18 }} />
                    )}
                  </Box>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', display: 'block', mt: 0.25 }}>
                    Last login: {lastLoginText}
                  </Typography>
                </Box>

                <Chip
                  label={isUserOnline ? 'Active' : 'Offline'}
                  size="small"
                  variant="outlined"
                  sx={{
                    borderColor: isUserOnline ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.15)',
                    color: isUserOnline ? '#4ade80' : 'rgba(255,255,255,0.5)',
                    fontSize: '0.7rem'
                  }}
                />
              </Box>
            )
          })}

          {usersList.length === 0 && (
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.35)', textAlign: 'center', py: 2 }}>
              Loading user accounts…
            </Typography>
          )}
        </Box>
      </Modal>

      {/* ── Inventory History Sidebar Drawer (ChatGPT Style History) ── */}
      <Drawer
        anchor="right"
        open={showHistoryDrawer}
        onClose={() => setShowHistoryDrawer(false)}
        transitionDuration={0}
        PaperProps={{
          sx: {
            width: { xs: '100vw', sm: 420 },
            bgcolor: '#0f172a',
            borderLeft: '1px solid rgba(255,255,255,0.12)',
            p: 2.5,
            color: '#f8fafc',
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, pb: 1.5, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon sx={{ color: '#38bdf8', fontSize: 26 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                Edit History Log
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                Saved snapshots with Date & Time
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={() => setShowHistoryDrawer(false)} sx={{ color: 'rgba(255,255,255,0.6)' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.65)', mb: 2, fontSize: '0.82rem', lineHeight: 1.5 }}>
          Every inventory change made by admins is stored here in real time. Click any historical version to review it and restore the entire inventory stock count!
        </Typography>

        <Button
          variant="outlined"
          onClick={() => setClearHistoryConfirmOpen(true)}
          disabled={clearHistoryLoading || historyList.length === 0}
          sx={{ mb: 2, color: '#fb7185', borderColor: 'rgba(251,113,133,0.4)', '&:hover': { borderColor: '#fb7185', bgcolor: 'rgba(251,113,133,0.08)' } }}
        >
          Clear Edit History
        </Button>

        {/* History List */}
        <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5 }}>
          {historyList.map((item) => (
            <Paper
              key={item.id}
              onClick={() => {
                setSelectedSnapshot(item)
                setRestoreConfirmOpen(true)
              }}
              sx={{
                p: 2,
                mb: 1.5,
                bgcolor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 2.5,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: 'rgba(56,189,248,0.08)',
                  borderColor: '#38bdf8',
                  transform: 'translateX(-3px)'
                }
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.75 }}>
                <Chip
                  label={item.editedBy || 'admin'}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    bgcolor: item.editedBy === 'rizlan12' ? 'rgba(74,222,128,0.15)' : 'rgba(56,189,248,0.15)',
                    color: item.editedBy === 'rizlan12' ? '#4ade80' : '#38bdf8',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                />
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>
                  {item.dateString} · {item.timeString}
                </Typography>
              </Box>

              <Typography variant="body2" sx={{ fontWeight: 700, color: '#f8fafc', mb: 0.5 }}>
                {item.description || 'Inventory updated'}
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, pt: 1, borderTop: '1px dashed rgba(255,255,255,0.08)' }}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)' }}>
                  Total Stock: <strong style={{ color: '#4ade80' }}>{item.totalUnits?.toLocaleString()}</strong> units
                </Typography>
                <Button
                  size="small"
                  startIcon={<RestoreIcon sx={{ fontSize: 16 }} />}
                  sx={{
                    fontSize: '0.72rem',
                    color: '#38bdf8',
                    textTransform: 'none',
                    py: 0.2,
                    px: 1,
                    bgcolor: 'rgba(56,189,248,0.08)',
                    '&:hover': { bgcolor: 'rgba(56,189,248,0.2)' }
                  }}
                >
                  Restore
                </Button>
              </Box>
            </Paper>
          ))}

          {historyList.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 5, color: 'rgba(255,255,255,0.4)' }}>
              <HistoryIcon sx={{ fontSize: 40, mb: 1, opacity: 0.4 }} />
              <Typography variant="body2">No historical edits recorded yet.</Typography>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                Snapshots will appear here automatically when any admin edits products or stock counts.
              </Typography>
            </Box>
          )}
        </Box>
      </Drawer>

      {/* ── Restore Snapshot Confirmation Dialog ── */}
      <Dialog
        open={restoreConfirmOpen}
        onClose={() => !restoreLoading && setRestoreConfirmOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: '#0f172a',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 3,
            p: { xs: 0.5, sm: 1 },
            width: { xs: 'calc(100vw - 24px)', sm: 460 },
            maxWidth: '460px',
            m: 1.5
          }
        }}
      >
        <DialogContent sx={{ color: 'rgba(255,255,255,0.85)', pt: { xs: 2, sm: 2.5 } }}>
          {selectedSnapshot && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="body2">
                Restore inventory saved at:
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#4ade80' }}>
                  📅 {selectedSnapshot.dateString} at ⏰ {selectedSnapshot.timeString}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255,255,255,0.6)', mt: 0.5 }}>
                  Edited By: <strong>{selectedSnapshot.editedBy}</strong>
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255,255,255,0.6)' }}>
                  Action: {selectedSnapshot.description}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255,255,255,0.6)' }}>
                  Total Stock Count: <strong>{selectedSnapshot.totalUnits?.toLocaleString()}</strong> units ({selectedSnapshot.totalProducts} products)
                </Typography>
              </Paper>
              <Typography variant="caption" sx={{ color: '#facc15' }}>
                ⚠️ Notice: Restoring will overwrite current live inventory quantities to match this historical version in real time across all logged-in devices.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => setRestoreConfirmOpen(false)}
            disabled={restoreLoading}
            sx={{ color: 'rgba(255,255,255,0.6)' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleRestoreSnapshot}
            disabled={restoreLoading}
            startIcon={restoreLoading ? <CircularProgress size={16} sx={{ color: '#021202' }} /> : <RestoreIcon />}
            sx={{
              bgcolor: '#38bdf8',
              color: '#021202',
              fontWeight: 700,
              '&:hover': { bgcolor: '#0284c7' }
            }}
          >
            {restoreLoading ? 'Restoring...' : 'Restore Now'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Clear Edit History Confirmation Dialog ── */}
      <Dialog
        open={clearHistoryConfirmOpen}
        onClose={() => !clearHistoryLoading && setClearHistoryConfirmOpen(false)}
        PaperProps={{
          sx: { bgcolor: '#0f172a', border: '1px solid rgba(251,113,133,0.3)', borderRadius: 3, p: 1 }
        }}
      >
        <DialogTitle sx={{ color: '#fb7185', fontWeight: 800 }}>
          Clear Edit History?
        </DialogTitle>
        <DialogContent sx={{ color: 'rgba(255,255,255,0.85)', pt: 1 }}>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            This deletes all saved edit-history snapshots. Your current inventory products and stock will not be changed.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => setClearHistoryConfirmOpen(false)}
            disabled={clearHistoryLoading}
            sx={{ color: 'rgba(255,255,255,0.6)' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleClearHistory}
            disabled={clearHistoryLoading}
            startIcon={clearHistoryLoading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null}
            sx={{
              bgcolor: '#e11d48',
              color: '#fff',
              fontWeight: 800,
              '&:hover': { bgcolor: '#be123c' }
            }}
          >
            {clearHistoryLoading ? 'Clearing...' : 'Yes, Clear History'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
