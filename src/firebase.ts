import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyA5Xa6OSbf6kzRswYAuWM1dlW54CbY2hfM",
  authDomain: "peruim-inventory.firebaseapp.com",
  projectId: "peruim-inventory",
  storageBucket: "peruim-inventory.firebasestorage.app",
  messagingSenderId: "910506945801",
  appId: "1:910506945801:web:c85f4bb2fa6e17eff6b7d8",
  measurementId: "G-YJNZ1NQK9K"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
export default app
