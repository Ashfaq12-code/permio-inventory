const fs = require('fs')
const path = require('path')

const dataPath = path.join(__dirname, 'data.json')
let data = {
  admin: null,
  users: [],
  products: []
}

function loadData(){
  try {
    if (fs.existsSync(dataPath)) {
      const raw = fs.readFileSync(dataPath, 'utf-8')
      data = JSON.parse(raw)
    }
  } catch (e) {
    console.error('Failed to load data.json:', e.message)
  }
}

function saveData(){
  try {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (e) {
    console.error('Failed to save data.json:', e.message)
  }
}

function ensureDefaults(){
  if (!data.users.some(u => u.username === 'rizlan12')) {
    data.users.push({ username: 'rizlan12', verified: false })
  }
  if (!data.users.some(u => u.username === 'ashfaq001')) {
    data.users.push({ username: 'ashfaq001', verified: false })
  }
  saveData()
}

function getAdmin(){
  return data.admin
}

function setAdmin(hash){
  data.admin = { password: hash }
  saveData()
}

function getUser(username){
  return data.users.find(u => u.username === username)
}

function addUser(username){
  if (!getUser(username)) {
    data.users.push({ username, verified: false })
    saveData()
  }
}

function getUsers(){
  return data.users
}

function updateUserVerified(username, verified){
  const user = getUser(username)
  if (!user) return false
  user.verified = !!verified
  saveData()
  return true
}

function setUserPassword(username, hash){
  const user = getUser(username)
  if (!user) return false
  user.password = hash
  saveData()
  return true
}

function getProducts(){
  return data.products
}

function addProduct(product){
  const nextId = data.products.length ? Math.max(...data.products.map(p => p.id)) + 1 : 1
  const record = { id: nextId, ...product }
  data.products.push(record)
  saveData()
  return record.id
}

function updateProductSizes(id, sizes){
  const product = data.products.find(p => String(p.id) === String(id))
  if (!product) return false
  product.sizes = sizes
  saveData()
  return true
}

loadData()

module.exports = {
  ensureDefaults,
  getAdmin,
  setAdmin,
  getUser,
  addUser,
  getUsers,
  updateUserVerified,
  setUserPassword,
  getProducts,
  addProduct,
  updateProductSizes
}
