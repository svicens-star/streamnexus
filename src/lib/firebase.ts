import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, query, where, onSnapshot, deleteDoc, getDocs } from 'firebase/firestore';

// Intentamos cargar la configuración real si existe
let firebaseConfig: any = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "TU_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "TU_AUTH_DOMAIN",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "TU_PROJECT_ID",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "TU_STORAGE_BUCKET",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "TU_MESSAGING_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "TU_APP_ID"
};

// En AI Studio, el archivo firebase-applet-config.json está en la raíz.
// Intentamos cargarlo usando import.meta.glob que es compatible con Vite.
const configs = import.meta.glob('../../firebase-applet-config.json', { eager: true });
const configKey = Object.keys(configs).find(key => key.includes('firebase-applet-config.json'));

if (configKey) {
  const externalConfig = (configs[configKey] as any).default || configs[configKey];
  firebaseConfig = { ...firebaseConfig, ...externalConfig };
  console.log('Firebase config loaded from file');
} else {
  console.warn('Firebase config file not found, using environment variables');
}

// No usar secretos hardcodeados: solo archivo de config o variables de entorno.
if (firebaseConfig.apiKey === "TU_API_KEY") {
  console.warn('Firebase config appears to use placeholders. Set VITE_FIREBASE_* env vars or firebase-applet-config.json.');
}

const firestoreDatabaseId =
  (firebaseConfig as any).firestoreDatabaseId ||
  import.meta.env.VITE_FIREBASE_DATABASE_ID;

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  onSnapshot,
  deleteDoc,
  getDocs
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}
