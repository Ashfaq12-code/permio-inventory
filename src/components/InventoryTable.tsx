import React, { useState, useRef } from 'react'
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Chip, Box, Typography, TextField, Button, Modal, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import SaveIcon from '@mui/icons-material/Save'
import CloseIcon from '@mui/icons-material/Close'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'

const SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'] as const

interface Product {
  id: string
  name: string
  sizes: Partial<Record<(typeof SIZES)[number], number>>
  image?: string
}

interface Props {
  products: Product[]
  isOwner?: boolean
  onUpdateQty: (id: string, size: string, deltaOrQty: number, isDelta?: boolean) => void
  onRename?: (id: string, name: string) => void
  onDelete?: (id: string) => void
  onUpdateImage?: (id: string, image: string) => void
}

/** Speaks the admin restriction alert in a natural female voice */
export function speakFemaleAlertVoice() {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel() // Cancel any previous speech immediately
    const text = "Only Admin accounts, rizlan12, are authorized to edit the inventory."
    const utterance = new SpeechSynthesisUtterance(text)
    
    // Pick female voice if available
    const voices = window.speechSynthesis.getVoices()
    const femaleVoice = voices.find(v =>
      (v.name.toLowerCase().includes('female') ||
       v.name.toLowerCase().includes('zira') ||
       v.name.toLowerCase().includes('samantha') ||
       v.name.toLowerCase().includes('karen') ||
       v.name.toLowerCase().includes('victoria') ||
       v.name.toLowerCase().includes('google us english') ||
       v.name.toLowerCase().includes('natural') ||
       v.name.toLowerCase().includes('jenny')) &&
      (v.lang.startsWith('en'))
    ) || voices.find(v => v.lang.startsWith('en'))

    if (femaleVoice) utterance.voice = femaleVoice
    utterance.pitch = 1.15 // slightly higher, bright & natural female pitch
    utterance.rate = 1.05  // clear, responsive conversational pace
    utterance.volume = 1.0

    window.speechSynthesis.speak(utterance)
  } catch (e) {
    console.error('Speech synthesis error:', e)
  }
}

/** Plays a warning chime using Web Audio API and announces female alert voice */
export function playAlertSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (AudioContextClass) {
      const ctx = new AudioContextClass()

      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      osc1.type = 'sawtooth'
      osc2.type = 'square'

      osc1.frequency.setValueAtTime(440, ctx.currentTime)
      osc1.frequency.setValueAtTime(293.66, ctx.currentTime + 0.15) // D4

      osc2.frequency.setValueAtTime(220, ctx.currentTime)
      osc2.frequency.setValueAtTime(146.83, ctx.currentTime + 0.15)

      gain.gain.setValueAtTime(0.35, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc1.start()
      osc2.start()
      osc1.stop(ctx.currentTime + 0.4)
      osc2.stop(ctx.currentTime + 0.4)
    }
  } catch (e) {
    console.error('Audio alert playback error:', e)
  }

  // Announce the restriction in clear female voice
  speakFemaleAlertVoice()
}

export default function InventoryTable({ products, isOwner = false, onUpdateQty, onRename, onDelete, onUpdateImage }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState<string>('')
  const [previewImage, setPreviewImage] = useState<{ id: string; name: string; src?: string } | null>(null)
  const [replacementImage, setReplacementImage] = useState<string>('')

  // Admin access warning modal state
  const [adminAlertOpen, setAdminAlertOpen] = useState(false)

  // Currently active/highlighted row id
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null)

  // Direct click-to-type number inline editing: { key: "id_size", val: string }
  const [editingNumberCell, setEditingNumberCell] = useState<string | null>(null)
  const [editingNumberVal, setEditingNumberVal] = useState<string>('')

  const handleStartNumberEdit = (prodId: string, size: string, currentVal: number) => {
    checkAdminAccess(() => {
      setHighlightedRowId(prodId)
      setEditingNumberCell(`${prodId}_${size}`)
      setEditingNumberVal(String(currentVal))
    })
  }

  const handleSaveNumberEdit = (prodId: string, size: string) => {
    if (editingNumberCell === `${prodId}_${size}`) {
      const parsed = parseInt(editingNumberVal.trim(), 10)
      const finalCount = isNaN(parsed) || parsed < 0 ? 0 : parsed
      onUpdateQty(prodId, size, finalCount, false)
      setEditingNumberCell(null)
      setEditingNumberVal('')
    }
  }

  const toggleHighlightRow = (id: string) => {
    // Only owners can highlight rows when inspecting/editing
    if (!isOwner) return
    setHighlightedRowId(prev => (prev === id ? null : id))
  }

  // Scroll ref for horizontal table navigation
  const tableContainerRef = useRef<HTMLDivElement>(null)

  const scrollTable = (direction: 'left' | 'right') => {
    if (!tableContainerRef.current) return
    const scrollAmount = direction === 'left' ? -350 : 350
    tableContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
  }

  // Guard function: checks if user is owner, otherwise triggers female voice + sound + 3s corner popup alert
  const checkAdminAccess = (actionCallback: () => void) => {
    if (isOwner) {
      actionCallback()
    } else {
      playAlertSound()
      setAdminAlertOpen(true)
    }
  }

  return (
    <>
      <Paper
        elevation={3}
        sx={{
          bgcolor: '#0b101a',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 3,
          overflow: 'hidden',
          width: '100%'
        }}
      >
        {/* Top Header Bar with Scroll Controls & Status */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          px: 2.5,
          py: 1.5,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(15, 23, 42, 0.7)',
          flexWrap: 'wrap',
          gap: 1.5
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SwapHorizIcon sx={{ color: '#34d399', fontSize: 20 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.02em' }}>
              Stock Inventory List ({products.length} Products)
            </Typography>
          </Box>

          {/* Desktop Left / Right Scroll Buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mr: 0.5, display: { xs: 'none', sm: 'inline' } }}>
              Scroll view:
            </Typography>

            <Tooltip title="Scroll Table Left">
              <Button
                variant="outlined"
                size="small"
                onClick={() => scrollTable('left')}
                startIcon={<ChevronLeftIcon />}
                sx={{
                  color: '#4ade80',
                  borderColor: 'rgba(74,222,128,0.3)',
                  bgcolor: 'rgba(74,222,128,0.06)',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  textTransform: 'none',
                  px: 1.5,
                  '&:hover': {
                    bgcolor: 'rgba(74,222,128,0.18)',
                    borderColor: '#4ade80'
                  }
                }}
              >
                Scroll Left
              </Button>
            </Tooltip>

            <Tooltip title="Scroll Table Right">
              <Button
                variant="outlined"
                size="small"
                onClick={() => scrollTable('right')}
                endIcon={<ChevronRightIcon />}
                sx={{
                  color: '#4ade80',
                  borderColor: 'rgba(74,222,128,0.3)',
                  bgcolor: 'rgba(74,222,128,0.06)',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  textTransform: 'none',
                  px: 1.5,
                  '&:hover': {
                    bgcolor: 'rgba(74,222,128,0.18)',
                    borderColor: '#4ade80'
                  }
                }}
              >
                Scroll Right
              </Button>
            </Tooltip>
          </Box>
        </Box>

        {/* Fully visible scrollable table container without dark shadow overlays */}
        <TableContainer
          ref={tableContainerRef}
          sx={{
            width: '100%',
            overflowX: 'auto',
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch',
            '&::-webkit-scrollbar': { height: 8 },
            '&::-webkit-scrollbar-track': { background: 'rgba(255,255,255,0.02)' },
            '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.15)', borderRadius: 4 },
            '&::-webkit-scrollbar-thumb:hover': { background: 'rgba(74,222,128,0.4)' }
          }}
        >
          <Table size="small" sx={{ minWidth: 1050, width: '100%' }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                <TableCell sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 700, width: 48, py: 1.5 }}>#</TableCell>
                <TableCell sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 700, minWidth: 320, py: 1.5 }}>Product</TableCell>
                {SIZES.map(s => (
                  <TableCell key={s} align="center" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 700, minWidth: 110, py: 1.5 }}>
                    {s}
                  </TableCell>
                ))}
                <TableCell align="center" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 700, width: 100, py: 1.5 }}>Status</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {products.map((p, idx) => {
                const total = SIZES.reduce((sum, s) => sum + (p.sizes?.[s] || 0), 0)
                const status = total >= 100 ? 'High' : total > 0 ? 'Low' : 'Out'
                const isHighlighted = highlightedRowId === p.id

                return (
                  <TableRow
                    key={p.id}
                    onClick={() => toggleHighlightRow(p.id)}
                    sx={{
                      cursor: 'pointer',
                      backgroundColor: isHighlighted
                        ? 'rgba(250, 204, 21, 0.16) !important'
                        : idx % 2 === 1
                        ? 'rgba(255,255,255,0.02)'
                        : 'transparent',
                      outline: isHighlighted ? '2px solid rgba(250, 204, 21, 0.65)' : 'none',
                      outlineOffset: '-2px',
                      boxShadow: isHighlighted ? 'inset 0 0 16px rgba(250, 204, 21, 0.15)' : 'none',
                      '&:hover': {
                        backgroundColor: isHighlighted
                          ? 'rgba(250, 204, 21, 0.22) !important'
                          : 'rgba(255,255,255,0.04)'
                      },
                      transition: 'background-color 0.2s ease, outline 0.2s ease, box-shadow 0.2s ease'
                    }}
                  >
                    <TableCell sx={{ color: isHighlighted ? '#facc15' : 'rgba(255,255,255,0.5)', fontSize: '0.82rem', fontWeight: isHighlighted ? 800 : 600 }}>
                      {idx + 1}
                    </TableCell>

                    <TableCell sx={{ minWidth: 320, p: 1.25, verticalAlign: 'middle' }}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 1.75, width: '100%' }}>
                        {p.image ? (
                          <Box
                            component="img"
                            src={p.image}
                            alt={p.name}
                            onClick={(e) => {
                              e.stopPropagation()
                              setPreviewImage({ id: p.id, name: p.name, src: p.image })
                              setReplacementImage('')
                            }}
                            sx={{
                              width: 52,
                              height: 52,
                              borderRadius: 2,
                              objectFit: 'cover',
                              border: isHighlighted ? '2px solid #facc15' : '1px solid rgba(255,255,255,0.12)',
                              cursor: 'pointer',
                              transition: 'transform 0.2s ease',
                              '&:hover': { transform: 'scale(1.06)', borderColor: '#facc15' }
                            }}
                          />
                        ) : (
                          <Box
                            className="product-thumb"
                            onClick={(e) => {
                              e.stopPropagation()
                              setPreviewImage({ id: p.id, name: p.name, src: p.image })
                              setReplacementImage('')
                            }}
                            sx={{
                              cursor: 'pointer',
                              width: 52,
                              height: 52,
                              borderRadius: 2,
                              border: isHighlighted ? '2px solid #facc15' : undefined
                            }}
                          >
                            No image
                          </Box>
                        )}

                        <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                          {editingId === p.id ? (
                            <Box
                              sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75 }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <TextField
                                size="small"
                                label="New name"
                                value={draftName}
                                onChange={e => setDraftName(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    const n = draftName.trim()
                                    if (!n) return
                                    checkAdminAccess(() => {
                                      onRename?.(p.id, n)
                                      setEditingId(null)
                                    })
                                  }
                                }}
                                sx={{ flex: '1 1 180px' }}
                              />
                              <IconButton size="small" color="primary" onClick={() => {
                                const n = draftName.trim()
                                if (!n) return
                                checkAdminAccess(() => {
                                  onRename?.(p.id, n)
                                  setEditingId(null)
                                })
                              }}>
                                <SaveIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" onClick={() => setEditingId(null)}>
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          ) : (
                            <>
                              <Typography sx={{
                                fontWeight: 700,
                                fontSize: '0.92rem',
                                color: isHighlighted ? '#fef08a' : '#f8fafc',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {p.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                                Total: <strong style={{ color: isHighlighted ? '#facc15' : '#4ade80' }}>{total}</strong>
                              </Typography>
                            </>
                          )}
                        </Box>

                        <Box
                          sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {editingId !== p.id && (
                            <>
                              <Button
                                size="small" variant="outlined"
                                onClick={() => checkAdminAccess(() => { setEditingId(p.id); setDraftName(p.name) })}
                                sx={{ minWidth: 'auto', px: 1, py: 0.2, borderColor: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.8)', fontSize: '0.72rem' }}
                              >
                                Rename
                              </Button>
                              <Button
                                size="small" color="error" variant="outlined"
                                onClick={() => checkAdminAccess(() => onDelete?.(p.id))}
                                sx={{ minWidth: 'auto', px: 1, py: 0.2, borderColor: 'rgba(255,255,255,0.12)', color: '#ff8a80', fontSize: '0.72rem' }}
                              >
                                Delete
                              </Button>
                            </>
                          )}
                        </Box>
                      </Box>
                    </TableCell>

                    {SIZES.map(s => (
                      <TableCell
                        key={s}
                        align="center"
                        sx={{ py: 1 }}
                      >
                        <Box
                          className="quantity-control"
                          sx={{
                            borderColor: isHighlighted ? 'rgba(250, 204, 21, 0.4)' : undefined,
                            bgcolor: isHighlighted ? 'rgba(250, 204, 21, 0.08)' : undefined
                          }}
                        >
                          <IconButton
                            size="small"
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              if (isOwner) setHighlightedRowId(p.id)
                              checkAdminAccess(() => {
                                onUpdateQty(p.id, s, -1, true)
                              })
                            }}
                            color="error"
                            sx={{
                              p: 1, // larger touch target for mobile
                              touchAction: 'manipulation' // prevents double-tap zoom & delay
                            }}
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          {editingNumberCell === `${p.id}_${s}` ? (
                            <TextField
                              autoFocus
                              size="small"
                              type="number"
                              value={editingNumberVal}
                              onChange={(e) => setEditingNumberVal(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveNumberEdit(p.id, s)
                                } else if (e.key === 'Escape') {
                                  setEditingNumberCell(null)
                                  setEditingNumberVal('')
                                }
                              }}
                              onBlur={() => handleSaveNumberEdit(p.id, s)}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                              }}
                              inputProps={{
                                min: 0,
                                inputMode: 'numeric',
                                pattern: '[0-9]*',
                                style: {
                                  textAlign: 'center',
                                  padding: '2px 4px',
                                  width: '38px',
                                  fontWeight: 800,
                                  fontSize: '0.95rem',
                                  color: '#38bdf8',
                                  backgroundColor: 'rgba(56, 189, 248, 0.12)',
                                  borderRadius: '6px'
                                }
                              }}
                              sx={{
                                width: '48px',
                                '& .MuiOutlinedInput-root': {
                                  padding: 0,
                                  '& fieldset': {
                                    borderColor: '#38bdf8'
                                  },
                                  '&:hover fieldset': {
                                    borderColor: '#0284c7'
                                  },
                                  '&.Mui-focused fieldset': {
                                    borderColor: '#38bdf8'
                                  }
                                }
                              }}
                            />
                          ) : (
                            <Tooltip title={isOwner ? "Click to erase & type custom number" : "Stock count"} arrow placement="top">
                              <Typography
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleStartNumberEdit(p.id, s, p.sizes?.[s] ?? 0)
                                }}
                                sx={{
                                  minWidth: 28,
                                  textAlign: 'center',
                                  fontWeight: 800,
                                  fontSize: '0.92rem',
                                  color: isHighlighted ? '#fef08a' : '#f8fafc',
                                  userSelect: 'none',
                                  cursor: 'pointer',
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                  transition: 'background-color 0.15s, color 0.15s',
                                  '&:hover': {
                                    bgcolor: 'rgba(255,255,255,0.12)',
                                    color: '#38bdf8'
                                  }
                                }}
                              >
                                {p.sizes?.[s] ?? 0}
                              </Typography>
                            </Tooltip>
                          )}
                          <IconButton
                            size="small"
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              if (isOwner) setHighlightedRowId(p.id)
                              checkAdminAccess(() => {
                                onUpdateQty(p.id, s, 1, true)
                              })
                            }}
                            color="primary"
                            sx={{
                              p: 1, // larger touch target for mobile
                              touchAction: 'manipulation' // prevents double-tap zoom & delay
                            }}
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    ))}

                    <TableCell align="center" sx={{ py: 1 }}>
                      {status === 'High' ? (
                        <Chip label={status} className="chip-high" />
                      ) : status === 'Low' ? (
                        <Chip label={status} className="chip-low" />
                      ) : (
                        <Chip label={status} color="default" />
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

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

      {/* Image Preview Modal */}
      <Modal open={Boolean(previewImage)} onClose={() => setPreviewImage(null)}>
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: { xs: '92vw', md: '70vw' }, maxWidth: 900, maxHeight: '90vh',
          bgcolor: 'rgba(5,10,18,0.97)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 3,
          boxShadow: 24, p: 2.5, outline: 'none', display: 'flex', flexDirection: 'column', gap: 2
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{previewImage?.name || 'Product Image'}</Typography>
            <IconButton onClick={() => setPreviewImage(null)} sx={{ color: 'white' }}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ display: 'grid', gap: 2 }}>
            {previewImage?.src ? (
              <Box component="img" src={replacementImage || previewImage.src} alt={previewImage.name}
                sx={{ width: '100%', height: 'auto', maxHeight: '65vh', objectFit: 'contain', borderRadius: 2 }} />
            ) : (
              <Box sx={{ p: 4, textAlign: 'center', color: 'rgba(255,255,255,0.7)', border: '1px dashed rgba(255,255,255,0.24)', borderRadius: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>No image assigned yet.</Typography>
                {replacementImage ? (
                  <Box component="img" src={replacementImage} alt="preview" sx={{ width: '100%', height: 'auto', maxHeight: '40vh', objectFit: 'contain', borderRadius: 2, mt: 1 }} />
                ) : (
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>Choose an image to assign to this product.</Typography>
                )}
              </Box>
            )}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              <Button
                variant="outlined"
                component="label"
                onClick={(e) => {
                  if (!isOwner) {
                    e.preventDefault()
                    playAlertSound()
                    setAdminAlertOpen(true)
                  }
                }}
                sx={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.24)' }}
              >
                Choose replacement
                <input type="file" hidden accept="image/*" onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = () => {
                    if (typeof reader.result === 'string') setReplacementImage(reader.result)
                  }
                  reader.readAsDataURL(file)
                }} />
              </Button>
              <Button variant="contained" disabled={!replacementImage} onClick={() => {
                checkAdminAccess(() => {
                  if (previewImage?.id != null && replacementImage) {
                    onUpdateImage?.(previewImage.id, replacementImage)
                    setPreviewImage(null)
                    setReplacementImage('')
                  }
                })
              }}>
                Replace Image
              </Button>
            </Box>
          </Box>
        </Box>
      </Modal>
    </>
  )
}
