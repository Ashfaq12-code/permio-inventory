import { db, auth } from './firebase'
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore'

const SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'] as const

const PRODUCT_NAMES = [
  'Argentina Home', 'Spain Home', 'Portugal Home', 'Brazil Home', 'Germany Home', 'France Home',
  'Italy Home', 'England Home', 'Netherlands Home', 'Belgium Home', 'Croatia Home', 'Uruguay Home',
  'Japan Home', 'Mexico Home', 'USA Home', 'Argentina Away', 'Spain Away', 'Portugal Away',
  'Brazil Away', 'Germany Away', 'France Away', 'Italy Away', 'England Away', 'Netherlands Away',
  'Belgium Away', 'Croatia Away', 'Uruguay Away', 'Japan Away', 'Mexico Away', 'USA Away',
  'Classic Home', 'Modern Home', 'Champion Home', 'Elite Home', 'City Home', 'County Home',
  'Premier Home', 'Heritage Home', 'Legacy Home', 'Victory Home', 'Speed Home', 'Fusion Home',
  'Icon Home', 'Royal Home', 'Striker Home', 'United Home', 'Empire Home', 'Phoenix Home',
  'Guardian Home', 'Legend Home', 'Storm Home', 'Blaze Home', 'Coastal Home', 'Arctic Home',
  'Solar Home', 'Lunar Home', 'Galaxy Home', 'Mystic Home', 'Titan Home', 'Nova Home',
  'Aurora Home', 'Ranger Home', 'Falcon Home', 'Voyage Home',
]

const PRODUCT_IMAGES = [
  'https://i.ibb.co/nqYW3Fkg/Whats-App-Image-2026-07-30-at-01-41-47.jpg',
  'https://i.ibb.co/N6XQL8ms/Whats-App-Image-2026-07-30-at-01-41-50.jpg',
  'https://i.ibb.co/SXxWvvGq/Whats-App-Image-2026-07-30-at-01-41-51.jpg',
  'https://i.ibb.co/1wgnYr6/Whats-App-Image-2026-07-30-at-01-41-53-1.jpg',
  'https://i.ibb.co/C5nMCCQc/Whats-App-Image-2026-07-30-at-01-41-53.jpg',
  'https://i.ibb.co/yBqnbrp8/Whats-App-Image-2026-07-30-at-01-41-54.jpg',
  'https://i.ibb.co/Zb19yrd/Whats-App-Image-2026-07-30-at-01-41-55.jpg',
  'https://i.ibb.co/MxGwhdky/Whats-App-Image-2026-07-30-at-01-41-56-1.jpg',
  'https://i.ibb.co/dwL97h8p/Whats-App-Image-2026-07-30-at-01-41-56.jpg',
  'https://i.ibb.co/WNXRgZXx/Whats-App-Image-2026-07-30-at-01-41-57-1.jpg',
  'https://i.ibb.co/YBzJFT45/Whats-App-Image-2026-07-30-at-01-41-57.jpg',
  'https://i.ibb.co/wZfBs0ZT/Whats-App-Image-2026-07-30-at-01-42-02.jpg',
  'https://i.ibb.co/sp66t93T/Whats-App-Image-2026-07-30-at-01-42-06-1.jpg',
  'https://i.ibb.co/84Xvdm6H/Whats-App-Image-2026-07-30-at-01-42-00.jpg',
  'https://i.ibb.co/Jjjb1cyx/Whats-App-Image-2026-07-30-at-01-42-01.jpg',
  'https://i.ibb.co/1JPpPhk6/Whats-App-Image-2026-07-30-at-01-42-03.jpg',
  'https://i.ibb.co/KxMZbWV4/Whats-App-Image-2026-07-30-at-01-42-05.jpg',
  'https://i.ibb.co/XZqKY5L6/Whats-App-Image-2026-07-30-at-01-42-06-1.jpg',
  'https://i.ibb.co/rf3Tb31M/Whats-App-Image-2026-07-30-at-01-42-06.jpg',
  'https://i.ibb.co/nq59KGBn/Whats-App-Image-2026-07-30-at-01-42-07-1.jpg',
  'https://i.ibb.co/MkMf6Vq6/Whats-App-Image-2026-07-30-at-01-42-07.jpg',
  'https://i.ibb.co/zHQbGwc1/Whats-App-Image-2026-07-30-at-01-42-08.jpg',
  'https://i.ibb.co/8gb9FdQL/Whats-App-Image-2026-07-30-at-01-42-09-1.jpg',
  'https://i.ibb.co/p66k3kXQ/Whats-App-Image-2026-07-30-at-01-42-09.jpg',
  'https://i.ibb.co/ynJ1vLGv/Whats-App-Image-2026-07-30-at-01-42-10.jpg',
  'https://i.ibb.co/p6rYvvSc/Whats-App-Image-2026-07-30-at-01-42-11-1.jpg',
  'https://i.ibb.co/RTLbWPwF/Whats-App-Image-2026-07-30-at-01-42-11.jpg',
  'https://i.ibb.co/zWxRfcsc/Whats-App-Image-2026-07-30-at-01-42-12.jpg',
  'https://i.ibb.co/8gFh8dTK/Whats-App-Image-2026-07-30-at-01-42-19.jpg',
  'https://i.ibb.co/SwmMTXz3/Whats-App-Image-2026-07-30-at-01-42-20.jpg',
  'https://i.ibb.co/x870jrBX/Whats-App-Image-2026-07-30-at-01-42-21.jpg',
  'https://i.ibb.co/C3SqJZ24/Whats-App-Image-2026-07-30-at-01-42-22.jpg',
  'https://i.ibb.co/m5cRmRnw/Whats-App-Image-2026-07-30-at-01-42-24.jpg',
  'https://i.ibb.co/JFgprJL3/Whats-App-Image-2026-07-30-at-01-42-25.jpg',
  'https://i.ibb.co/vxgvm4c2/Whats-App-Image-2026-07-30-at-01-42-27.jpg',
  'https://i.ibb.co/PZqGRJf0/Whats-App-Image-2026-07-30-at-01-42-28.jpg',
  'https://i.ibb.co/JjZH4FMS/Whats-App-Image-2026-07-30-at-01-42-29.jpg',
  'https://i.ibb.co/mC1pW1t3/Whats-App-Image-2026-07-30-at-01-42-30.jpg',
  'https://i.ibb.co/ccDntLWt/Whats-App-Image-2026-07-30-at-01-42-31.jpg',
  'https://i.ibb.co/Vc6qg21y/Whats-App-Image-2026-07-30-at-01-42-32.jpg',
  'https://i.ibb.co/twCtGkcf/Whats-App-Image-2026-07-30-at-01-42-36.jpg',
  'https://i.ibb.co/3VdJMNw/Whats-App-Image-2026-07-30-at-01-42-37.jpg',
  'https://i.ibb.co/2YttDVMr/Whats-App-Image-2026-07-30-at-01-42-39.jpg',
  'https://i.ibb.co/rKFS7ssQ/Whats-App-Image-2026-07-30-at-01-42-41.jpg',
  'https://i.ibb.co/RpfDMKvx/Whats-App-Image-2026-07-30-at-01-42-42.jpg',
  'https://i.ibb.co/604yTrVj/Whats-App-Image-2026-07-30-at-01-42-43.jpg',
  'https://i.ibb.co/GQRqcwJL/Whats-App-Image-2026-07-30-at-01-42-44.jpg',
  'https://i.ibb.co/gk77YWQ/Whats-App-Image-2026-07-30-at-01-42-46.jpg',
  'https://i.ibb.co/HLk4d0bF/Whats-App-Image-2026-07-30-at-01-42-47.jpg',
]

export function getSeedProducts() {
  const products = []
  for (let i = 1; i <= 64; i++) {
    const sizeCounts: Record<string, number> = {}
    SIZES.forEach(s => { sizeCounts[s] = 0 })
    products.push({
      name: PRODUCT_NAMES[(i - 1) % PRODUCT_NAMES.length],
      image: PRODUCT_IMAGES[(i - 1) % PRODUCT_IMAGES.length],
      sizes: sizeCounts,
      order: i,
      updatedBy: 'system'
    })
  }
  return products
}

/** Reset database to default 64 products with 0 stock */
export async function resetTo64Products(): Promise<void> {
  const productsRef = collection(db, 'products')
  const snapshot = await getDocs(productsRef)

  // Delete all existing product documents
  const batch = writeBatch(db)
  snapshot.docs.forEach(docSnap => {
    batch.delete(docSnap.ref)
  })
  await batch.commit()

  // Re-seed exactly 64 products with 0 stock
  console.log('[API] Clean seeding 64 products to Firestore with 0 stock...')
  const seeds = getSeedProducts()
  const seedBatch = writeBatch(db)
  seeds.forEach(product => {
    seedBatch.set(doc(productsRef), { ...product, updatedAt: serverTimestamp() })
  })
  await seedBatch.commit()
  console.log('[API] Clean seeding complete!')
}

/** Reset all existing products' stock counts to 0 across all sizes */
export async function resetAllStockToZero(adminUsername = 'rizlan12'): Promise<void> {
  const productsRef = collection(db, 'products')
  const snapshot = await getDocs(productsRef)
  const zeroSizes: Record<string, number> = {}
  SIZES.forEach(s => { zeroSizes[s] = 0 })

  const batch = writeBatch(db)
  snapshot.docs.forEach(docSnap => {
    batch.update(docSnap.ref, {
      sizes: zeroSizes,
      updatedAt: serverTimestamp(),
      updatedBy: `${adminUsername} (Reset all stock to 0)`
    })
  })
  await batch.commit()
  console.log(`[API] Successfully reset all ${snapshot.size} products to 0 stock!`)

  // Record history snapshot for the reset
  const updatedSnapshot = snapshot.docs.map(d => ({
    id: d.id,
    name: d.data().name || 'Unnamed',
    image: d.data().image || '',
    sizes: zeroSizes,
    order: d.data().order || 0
  }))
  scheduleHistorySnapshot(updatedSnapshot, adminUsername, 'Reset all product stock counts to 0 for new inventory')
}

/** Seed initial products to Firestore ONLY if the collection is completely empty (0 products) */
export async function seedIfEmpty(): Promise<void> {
  const productsRef = collection(db, 'products')
  const snapshot = await getDocs(productsRef)
  if (snapshot.empty) {
    console.log('[API] Seeding initial products to empty Firestore...')
    const seeds = getSeedProducts()
    const seedBatch = writeBatch(db)
    seeds.forEach(product => {
      seedBatch.set(doc(productsRef), { ...product, updatedAt: serverTimestamp() })
    })
    await seedBatch.commit()
    console.log('[API] Initial seeding complete.')
  }
}

/** Subscribe to real-time product updates. Returns an unsubscribe function. */
export function subscribeProducts(
  callback: (products: any[]) => void,
  onError?: (error: Error) => void
): () => void {
  const productsRef = collection(db, 'products')
  return onSnapshot(productsRef, snapshot => {
    const products = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    // Sort in memory to avoid Firestore index drops or null-order exclusions
    products.sort((a: any, b: any) => {
      const orderA = typeof a.order === 'number' ? a.order : 999999
      const orderB = typeof b.order === 'number' ? b.order : 999999
      return orderA - orderB
    })
    callback(products)
  }, error => {
    console.error('[API] Product subscription failed:', error)
    onError?.(error)
  })
}

function getUpdatedBy(): string {
  const email = auth.currentUser?.email || ''
  return email.split('@')[0] || 'unknown'
}

export async function addProductApi(product: any): Promise<any> {
  const productsRef = collection(db, 'products')
  const snapshot = await getDocs(productsRef)
  const maxOrder = snapshot.docs.reduce((max, d) => Math.max(max, Number(d.data().order) || 0), 0)

  const docRef = await addDoc(productsRef, {
    name: product.name || 'Unnamed Product',
    image: product.image || '',
    sizes: product.sizes || {},
    order: maxOrder + 1,
    updatedAt: serverTimestamp(),
    updatedBy: getUpdatedBy()
  })
  return { id: docRef.id, ...product }
}

export async function updateProductSizes(id: string, sizes: Record<string, number>, isPartial = false): Promise<void> {
  const updatePayload: any = {
    updatedAt: serverTimestamp(),
    updatedBy: getUpdatedBy()
  }
  if (isPartial) {
    // Update specific sizes key (e.g. "sizes.M": 4) without overwriting other sizes
    for (const [sizeKey, val] of Object.entries(sizes)) {
      updatePayload[`sizes.${sizeKey}`] = val
    }
  } else {
    updatePayload.sizes = sizes
  }
  await updateDoc(doc(db, 'products', id), updatePayload)
}

export async function updateProductName(id: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'products', id), {
    name,
    updatedAt: serverTimestamp(),
    updatedBy: getUpdatedBy()
  })
}

export async function updateProductImage(id: string, image: string): Promise<void> {
  await updateDoc(doc(db, 'products', id), {
    image,
    updatedAt: serverTimestamp(),
    updatedBy: getUpdatedBy()
  })
}

export async function deleteProductApi(id: string): Promise<void> {
  await deleteDoc(doc(db, 'products', id))
}

export interface InventoryHistoryEntry {
  id: string
  timestamp: string // ISO string
  dateString: string
  timeString: string
  editedBy: string
  description: string
  totalUnits: number
  totalProducts: number
  snapshot: any[] // full snapshot of all products and their sizes
}

/** Record a history snapshot whenever an admin edits inventory */
let snapshotDebounceTimeout: any = null
export function scheduleHistorySnapshot(
  products: any[],
  editedBy: string,
  description: string
) {
  if (snapshotDebounceTimeout) clearTimeout(snapshotDebounceTimeout)
  snapshotDebounceTimeout = setTimeout(async () => {
    try {
      if (!products || products.length === 0) return
      const now = new Date()
      const dateString = now.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }) // e.g. "05 Sep 2026"
      const timeString = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) // e.g. "03:15:20 AM"

      const totalUnits = products.reduce((sum, item) => {
        return sum + (Object.values(item.sizes || {}) as number[]).reduce((s, v) => s + v, 0)
      }, 0)

      // Clean snapshot (serialize products, sizes, names, images, order)
      const cleanSnapshot = products.map(p => ({
        id: p.id,
        name: p.name || 'Unnamed',
        image: p.image || '',
        sizes: p.sizes || {},
        order: typeof p.order === 'number' ? p.order : 0
      }))

      await addDoc(collection(db, 'inventory_history'), {
        timestamp: now.toISOString(),
        dateString,
        timeString,
        editedBy: editedBy || 'admin',
        description,
        totalUnits,
        totalProducts: products.length,
        snapshot: cleanSnapshot,
        createdAt: serverTimestamp()
      })
      console.log(`[History] Saved snapshot by ${editedBy}: ${description}`)
    } catch (e) {
      console.error('[History] Failed to record history snapshot:', e)
    }
  }, 1200) // Debounced by 1.2s so clicking + 5 times in a row creates 1 clean snapshot
}

/** Real-time subscription to inventory history snapshots (last 30 snapshots) */
export function subscribeInventoryHistory(callback: (history: InventoryHistoryEntry[]) => void): () => void {
  const historyRef = collection(db, 'inventory_history')
  const q = query(historyRef, orderBy('timestamp', 'desc'), limit(40))
  return onSnapshot(q, snapshot => {
    const list: InventoryHistoryEntry[] = snapshot.docs.map(d => ({
      id: d.id,
      ...(d.data() as any)
    }))
    callback(list)
  }, err => {
    console.error('[History] Subscription error:', err)
  })
}

/** Delete all saved inventory history snapshots without changing products. */
export async function clearInventoryHistory(): Promise<void> {
  const snapshot = await getDocs(collection(db, 'inventory_history'))
  const batch = writeBatch(db)
  snapshot.docs.forEach(historyDoc => batch.delete(historyDoc.ref))
  await batch.commit()
}

/** Restore the entire inventory to an old historical snapshot using writeBatch for ultra-fast restore (< 1s) */
export async function restoreInventoryFromSnapshot(
  snapshot: any[],
  adminUsername: string,
  snapshotLabel: string
): Promise<void> {
  if (!snapshot || !Array.isArray(snapshot) || snapshot.length === 0) {
    throw new Error('Snapshot data is empty or invalid.')
  }

  // Firestore allows up to 500 writes per batch. 64 products fits in a single batch!
  const batch = writeBatch(db)
  for (const item of snapshot) {
    if (!item.id) continue
    const productRef = doc(db, 'products', item.id)
    batch.set(productRef, {
      name: item.name,
      image: item.image || '',
      sizes: item.sizes || {},
      order: item.order ?? 0,
      updatedAt: serverTimestamp(),
      updatedBy: `${adminUsername} (Restored from ${snapshotLabel})`
    }, { merge: true })
  }

  // Commit all product restorations in 1 network round-trip (< 1 second)
  await batch.commit()

  // Record that a restore was executed
  const now = new Date()
  await addDoc(collection(db, 'inventory_history'), {
    timestamp: now.toISOString(),
    dateString: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    timeString: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    editedBy: adminUsername,
    description: `Restored inventory to snapshot (${snapshotLabel})`,
    totalUnits: snapshot.reduce((sum, item) => sum + (Object.values(item.sizes || {}) as number[]).reduce((s, v) => s + v, 0), 0),
    totalProducts: snapshot.length,
    snapshot,
    createdAt: serverTimestamp()
  })
}

export default {
  subscribeProducts,
  seedIfEmpty,
  resetTo64Products,
  addProductApi,
  updateProductSizes,
  updateProductName,
  updateProductImage,
  deleteProductApi,
  scheduleHistorySnapshot,
  subscribeInventoryHistory,
  clearInventoryHistory,
  restoreInventoryFromSnapshot,
  resetAllStockToZero
}
