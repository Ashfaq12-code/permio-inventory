import { auth, db } from './firebase'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type User
} from 'firebase/auth'
import { doc, getDoc, setDoc, collection, getDocs, onSnapshot, serverTimestamp } from 'firebase/firestore'

export const OWNER_USERNAMES = ['ashfaq001', 'rizlan12']

export function usernameToEmail(username: string): string {
  return `${username.toLowerCase().trim()}@peruim.inventory`
}

export interface LoginResult {
  ok: boolean
  error?: string
  firstTime?: boolean
  role?: 'owner' | 'editor' | 'viewer'
}

export async function loginUser(username: string, password: string): Promise<LoginResult> {
  const normalizedUsername = username.toLowerCase().trim()
  if (!normalizedUsername) return { ok: false, error: 'Username is required.' }
  if (normalizedUsername.length < 3) return { ok: false, error: 'Username must be at least 3 characters.' }
  if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' }

  const email = usernameToEmail(normalizedUsername)
  const isOwner = OWNER_USERNAMES.includes(normalizedUsername)

  // Other usernames must contain at least one number (e.g. lobby02, lobby001, lobby3)
  if (!isOwner && !/\d/.test(normalizedUsername)) {
    return { ok: false, error: 'Username must include at least one number (e.g. lobby02, lobby001, lobby3).' }
  }

  // Update Firestore status AFTER user is authenticated in Firebase Auth
  const updateLoginStatus = async (roleOverride?: 'owner' | 'editor' | 'viewer') => {
    try {
      const userDocRef = doc(db, 'users', normalizedUsername)
      const existingDoc = await getDoc(userDocRef)
      const existingRole = existingDoc.exists() ? existingDoc.data().role : null
      const finalRole = isOwner ? 'owner' : (roleOverride || existingRole || 'editor')

      await setDoc(userDocRef, {
        username: normalizedUsername,
        role: finalRole,
        lastLogin: new Date().toISOString(),
        lastActive: serverTimestamp(),
        isOnline: true,
        ...(existingDoc.exists() ? {} : { createdAt: new Date().toISOString() })
      }, { merge: true })

      return finalRole
    } catch (e) {
      console.error('[updateLoginStatus] Error updating user doc:', e)
      return isOwner ? 'owner' : 'editor'
    }
  }

  // ── SPECIAL UNSTOPPABLE LOGIN FOR ADMIN / OWNER ACCOUNTS (rizlan12 & ashfaq001) ──
  if (isOwner) {
    // Attempt 1: Standard email sign in
    try {
      await signInWithEmailAndPassword(auth, email, password)
      const role = await updateLoginStatus()
      return { ok: true, role }
    } catch {
      // Attempt 2: Auto-create standard email if first time with this password
      try {
        await createUserWithEmailAndPassword(auth, email, password)
        const role = await updateLoginStatus()
        return { ok: true, role }
      } catch {
        // Attempt 3: Admin fallback alias email (resolves any Firebase Auth credential lock-out)
        const adminAliasEmail = `${normalizedUsername}_admin@peruim.inventory`
        try {
          await signInWithEmailAndPassword(auth, adminAliasEmail, password)
          const role = await updateLoginStatus()
          return { ok: true, role }
        } catch {
          try {
            await createUserWithEmailAndPassword(auth, adminAliasEmail, password)
            const role = await updateLoginStatus()
            return { ok: true, role }
          } catch {
            return { ok: false, error: `Incorrect password for "${normalizedUsername}".` }
          }
        }
      }
    }
  }

  // ── STANDARD USER LOGIN FLOW ──
  try {
    await signInWithEmailAndPassword(auth, email, password)
    const role = await updateLoginStatus()
    return { ok: true, role }
  } catch (signInErr: any) {
    console.log(`[loginUser] Sign-in failed for standard user "${normalizedUsername}":`, signInErr.code)

    if (
      signInErr.code === 'auth/user-not-found' ||
      signInErr.code === 'auth/invalid-credential'
    ) {
      try {
        await createUserWithEmailAndPassword(auth, email, password)
        const role = await updateLoginStatus('editor')
        return { ok: true, firstTime: true, role }
      } catch (createErr: any) {
        if (createErr.code === 'auth/email-already-in-use') {
          return { ok: false, error: `Incorrect password for "${normalizedUsername}".` }
        }
        return { ok: false, error: `Incorrect password for "${normalizedUsername}".` }
      }
    }

    return { ok: false, error: `Incorrect password for "${normalizedUsername}".` }
  }
}

/** Verify current password and change user's password (Instagram style identity verification) */
export async function changeUserPasswordWithCurrent(
  currentPassword: string,
  newPassword: string
): Promise<{ ok: boolean; error?: string }> {
  if (!auth.currentUser || !auth.currentUser.email) {
    return { ok: false, error: 'No user is currently logged in.' }
  }
  if (!currentPassword) {
    return { ok: false, error: 'Please enter your current password.' }
  }
  if (newPassword.length < 6) {
    return { ok: false, error: 'New password must be at least 6 characters.' }
  }

  const userEmail = auth.currentUser.email
  const credential = EmailAuthProvider.credential(userEmail, currentPassword)

  // Step 1: Re-authenticate to verify Current Password (Instagram-style identity check)
  try {
    await reauthenticateWithCredential(auth.currentUser, credential)
  } catch (reauthErr: any) {
    console.error('Re-authentication failed:', reauthErr)
    if (
      reauthErr.code === 'auth/wrong-password' ||
      reauthErr.code === 'auth/invalid-credential'
    ) {
      return { ok: false, error: 'Incorrect current password. Please enter your correct current password.' }
    }
    return { ok: false, error: 'Current password verification failed. Please check your current password.' }
  }

  // Step 2: Update password to New Password
  const currentUsername = (userEmail.split('@')[0] || '').toLowerCase()

  try {
    await updatePassword(auth.currentUser, newPassword)
    const nowIso = new Date().toISOString()

    // Update user document in Firestore with lastPasswordChange and latestPassword
    await setDoc(doc(db, 'users', currentUsername), {
      lastPasswordChange: nowIso,
      latestPassword: newPassword
    }, { merge: true })

    // If rizlan12 changes password: Force logout ALL accounts in real-time EXCEPT ashfaq001!
    if (currentUsername === 'rizlan12') {
      await setDoc(doc(db, 'system', 'auth_config'), {
        forceLogoutAllExceptAshfaq: nowIso,
        updatedBy: 'rizlan12'
      }, { merge: true })
    }

    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message || 'Failed to update password.' }
  }
}

/** Real-time listener for force logout signal */
export function subscribeForceLogout(callback: (logoutTime: string) => void): () => void {
  return onSnapshot(doc(db, 'system', 'auth_config'), docSnap => {
    if (docSnap.exists() && docSnap.data().forceLogoutAllExceptAshfaq) {
      callback(docSnap.data().forceLogoutAllExceptAshfaq)
    }
  })
}

export async function logoutUser() {
  const currentUsername = auth.currentUser?.email?.split('@')[0]
  if (currentUsername) {
    try {
      await setDoc(doc(db, 'users', currentUsername), {
        isOnline: false,
        lastLogout: new Date().toISOString()
      }, { merge: true })
    } catch (e) {
      console.error('Logout status update error:', e)
    }
  }
  await signOut(auth)
}

export async function addUserToFirestore(
  username: string,
  role: 'editor' | 'viewer' = 'editor'
): Promise<{ ok: boolean; error?: string }> {
  const normalizedUsername = username.toLowerCase().trim()
  if (!normalizedUsername) return { ok: false, error: 'Username is required.' }
  if (normalizedUsername.length < 3) return { ok: false, error: 'Username must be at least 3 characters.' }
  if (!OWNER_USERNAMES.includes(normalizedUsername) && !/\d/.test(normalizedUsername)) {
    return { ok: false, error: 'Username must include at least one number (e.g. lobby02, lobby001, lobby3).' }
  }

  await setDoc(doc(db, 'users', normalizedUsername), {
    username: normalizedUsername,
    role,
    createdAt: new Date().toISOString(),
    lastLogin: null,
    isOnline: false
  }, { merge: true })
  return { ok: true }
}

export async function getFirestoreUsers(): Promise<any[]> {
  const snapshot = await getDocs(collection(db, 'users'))
  return snapshot.docs.map(d => ({ username: d.id, ...d.data() }))
}

export function subscribeUsers(callback: (users: any[]) => void): () => void {
  return onSnapshot(collection(db, 'users'), snapshot => {
    const users = snapshot.docs.map(d => ({ username: d.id, ...d.data() }))
    callback(users)
  })
}

export function onAuthStateChanged(callback: (user: User | null) => void) {
  return firebaseOnAuthStateChanged(auth, callback)
}
