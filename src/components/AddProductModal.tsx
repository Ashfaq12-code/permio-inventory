import React, { useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Box, Typography } from '@mui/material'

interface Props {
  open: boolean
  onClose: () => void
  onAdd: (p: any) => void
  isOwner?: boolean
  onTriggerAlert?: () => void
}

const sizesList = ['S','M','L','XL','2XL','3XL']

export default function AddProductModal({ open, onClose, onAdd, isOwner = true, onTriggerAlert }: Props){
  const [name, setName] = useState<string>('')
  const [qty, setQty] = useState<number>(0)
  const [image, setImage] = useState<string>('')
  const [imageFileName, setImageFileName] = useState<string>('')
  const [sizes, setSizes] = useState<Record<string,number>>(() => sizesList.reduce((acc,s) => { acc[s] = 0; return acc }, {} as Record<string,number>))

  const handleAdd = () => {
    if (!isOwner) {
      onClose()
      if (onTriggerAlert) onTriggerAlert()
      return
    }
    const trimmedName = name.trim()
    if (!trimmedName) return
    const totalSizes = sizesList.reduce((sum, s) => sum + (sizes[s] || 0), 0)
    const finalSizes = totalSizes > 0 ? sizes : { ...sizes, S: qty > 0 ? qty : 0 }
    onAdd({ name: trimmedName, image, sizes: finalSizes })
    setName('')
    setQty(0)
    setImage('')
    setImageFileName('')
    setSizes(sizesList.reduce((acc,s) => { acc[s] = 0; return acc }, {} as Record<string,number>))
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setImageFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImage(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add Product</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <TextField label="Product name" fullWidth value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} margin="normal" />
          <TextField
            label="Initial quantity (total)"
            type="number"
            fullWidth
            value={String(qty)}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQty(Math.max(0, Number(e.target.value)))}
            inputProps={{ min: 0, step: 1 }}
            margin="normal"
          />
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.68)' }}>
            If no size values are entered, this quantity is assigned to size S.
          </Typography>
          <TextField label="Image URL (optional)" fullWidth value={image} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setImage(e.target.value)} margin="normal" />
          <Button variant="outlined" component="label" sx={{ mt: 1 }}>
            Upload image file
            <input hidden accept="image/*" type="file" onChange={handleFileChange} />
          </Button>
          {imageFileName && (
            <Typography sx={{ mt: 1, color: 'rgba(255,255,255,0.7)' }}>Selected file: {imageFileName}</Typography>
          )}
          {image && (
            <Box component="img" src={image} alt="Product preview" sx={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 2, mt: 2, border: '1px solid rgba(255,255,255,0.12)' }} />
          )}
          <Typography sx={{ mt: 2, mb: 1, fontWeight: 600 }}>Size inventory</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1 }}>
            {sizesList.map((s) => (
              <TextField
                key={s}
                label={s}
                type="number"
                value={String(sizes[s] || 0)}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSizes((prev) => ({ ...prev, [s]: Math.max(0, Number(e.target.value)) }))}
                inputProps={{ min: 0, step: 1 }}
              />
            ))}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleAdd}>Add</Button>
      </DialogActions>
    </Dialog>
  )
}
