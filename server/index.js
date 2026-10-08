const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const session = require('express-session')
const bcrypt = require('bcrypt')
const helmet = require('helmet')
const db = require('./db')

const app = express()
app.use(helmet())
app.use(cors({ origin: true, credentials: true }))
app.use(bodyParser.json())

app.use(session({
  secret: process.env.SESSION_SECRET || 'devsecret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}))

// ensure default users exist for convenience (no passwords)
db.ensureDefaults()

app.post('/api/admin/set', (req, res) => {
  const { password } = req.body
  if (!password) return res.status(400).json({ error: 'password required' })
  bcrypt.hash(password, 10).then(hash => {
    db.setAdmin(hash)
    res.json({ ok: true })
  }).catch(e => res.status(500).json({ error: e.message }))
})

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body
  const admin = db.getAdmin()
  if (!admin || !admin.password) return res.status(400).json({ error: 'no admin' })
  bcrypt.compare(password || '', admin.password).then(ok => {
    if (ok) {
      req.session.isAdmin = true
    }
    res.json({ ok })
  }).catch(e => res.status(500).json({ error: e.message }))
})

// require authentication for sensitive admin actions
function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) return next()
  return res.status(401).json({ error: 'unauthorized' })
}

app.post('/api/admin/change', requireAuth, (req, res) => {
  const { next } = req.body
  if (!next) return res.status(400).json({ error: 'new password required' })
  bcrypt.hash(next, 10).then(hash => {
    db.run('UPDATE admin SET password = ? WHERE id = (SELECT id FROM admin LIMIT 1)', [hash], function(err) {
      if (err) return res.status(500).json({ error: err.message })
      res.json({ ok: true })
    })
  }).catch(e => res.status(500).json({ error: e.message }))
})

// Admin password reset via token (useful for CLI-based recovery). Provide RESET_TOKEN env var.
app.post('/api/admin/reset', (req, res) => {
  const { token, next } = req.body
  if (!process.env.RESET_TOKEN) return res.status(400).json({ error: 'reset not configured' })
  if (!token || token !== process.env.RESET_TOKEN) return res.status(403).json({ error: 'invalid token' })
  if (!next) return res.status(400).json({ error: 'new password required' })
  bcrypt.hash(next, 10).then(hash => {
    db.run('UPDATE admin SET password = ? WHERE id = (SELECT id FROM admin LIMIT 1)', [hash], function(err) {
      if (err) return res.status(500).json({ error: err.message })
      res.json({ ok: true })
    })
  }).catch(e => res.status(500).json({ error: e.message }))
})

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }))
})

// Users endpoints
app.get('/api/users', requireAuth, (req, res) => {
  const users = db.getUsers().map(u => ({ username: u.username, verified: !!u.verified }))
  res.json(users)
})

app.post('/api/users', requireAuth, (req, res) => {
  const { username } = req.body
  if (!username) return res.status(400).json({ error: 'username required' })
  db.addUser(username)
  res.json({ ok: true })
})

app.put('/api/users/:username/verify', requireAuth, (req, res) => {
  const username = req.params.username
  const { verified } = req.body
  const ok = db.updateUserVerified(username, verified)
  res.json({ changes: ok ? 1 : 0 })
})

// Public user login (self-service)
app.post('/api/user/login', (req, res) => {
  const { username, password } = req.body
  if (!username) return res.status(400).json({ error: 'username required' })
  const user = db.getUser(username)
  if (!user) return res.status(404).json({ error: 'no such user' })
  if (!user.password) return res.json({ needCreate: true })
  bcrypt.compare(password || '', user.password).then(ok => {
    res.json({ ok, verified: !!user.verified })
  }).catch(e => res.status(500).json({ error: e.message }))
})

// Public set password for first-time user
app.post('/api/user/set-password', (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'username and password required' })
  const user = db.getUser(username)
  if (!user) return res.status(404).json({ error: 'no such user' })
  if (user.password) return res.status(400).json({ error: 'password already set' })
  bcrypt.hash(password, 10).then(hash => {
    const ok = db.setUserPassword(username, hash)
    if (!ok) return res.status(500).json({ error: 'failed to set password' })
    res.json({ ok: true })
  }).catch(e => res.status(500).json({ error: e.message }))
})

app.get('/api/products', requireAuth, (req, res) => {
  const products = db.getProducts().map(p => ({ id: p.id, name: p.name, image: p.image, sizes: p.sizes || {} }))
  res.json(products)
})

app.post('/api/products', requireAuth, (req, res) => {
  const { name, image, sizes } = req.body
  const id = db.addProduct({ name, image, sizes: sizes || {} })
  res.json({ id })
})

app.put('/api/products/:id', requireAuth, (req, res) => {
  const id = req.params.id
  const { sizes } = req.body
  const ok = db.updateProductSizes(id, sizes || {})
  res.json({ changes: ok ? 1 : 0 })
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log('Server listening on', PORT))
