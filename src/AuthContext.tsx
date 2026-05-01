import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, doc, getDoc, setDoc, onAuthStateChanged, handleFirestoreError, OperationType, signOut } from './lib/firebase';
import { User } from 'firebase/auth';
import { toast } from 'sonner';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'user' | 'admin';
  subscriptionTier: 'free' | 'basic' | 'premium';
  subscribedPacks: string[];
  subscriptionExpiry?: string;
  activeDevices?: string[];
}

interface DeviceLimitsConfig {
  maxDevicesUser: number;
  maxDevicesAdmin: number;
}

const OWNER_ADMIN_EMAIL = 's.vicens.1160@gmail.com';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthReady: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAuthReady: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        let deviceId = localStorage.getItem('nexus_device_id');
        if (!deviceId) {
          deviceId = Math.random().toString(36).substring(2, 15);
          localStorage.setItem('nexus_device_id', deviceId);
        }

        const docRef = doc(db, 'users', user.uid);
        const limitsRef = doc(db, 'settings', 'deviceLimits');
        try {
          const limitsSnap = await getDoc(limitsRef);
          const limitsData = limitsSnap.exists() ? (limitsSnap.data() as Partial<DeviceLimitsConfig>) : {};
          const maxDevicesUser = Math.max(1, Number(limitsData.maxDevicesUser ?? 3));
          const maxDevicesAdmin = Math.max(1, Number(limitsData.maxDevicesAdmin ?? 999));

          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            const isOwnerAdmin = (user.email || '').toLowerCase() === OWNER_ADMIN_EMAIL.toLowerCase();

            // Garantiza que el propietario siempre conserve permisos de admin.
            if (isOwnerAdmin && data.role !== 'admin') {
              data.role = 'admin';
              data.subscriptionTier = 'premium';
              await setDoc(docRef, { role: 'admin', subscriptionTier: 'premium' }, { merge: true });
            }
            
            // Check device limit
            const devices = data.activeDevices || [];
            const isAdmin = data.role === 'admin' || isOwnerAdmin;
            const maxDevices = isAdmin ? maxDevicesAdmin : maxDevicesUser;
            if (!devices.includes(deviceId)) {
              if (devices.length >= maxDevices) {
                await signOut(auth);
                toast.error(`Límite de dispositivos alcanzado (Máx ${maxDevices}).`);
                setLoading(false);
                setIsAuthReady(true);
                return;
              }
              // Add current device
              const updatedDevices = [...devices, deviceId];
              await setDoc(docRef, { activeDevices: updatedDevices }, { merge: true });
              data.activeDevices = updatedDevices;
            }

            setProfile(data);
          } else {
            // Crear perfil inicial si no existe
            const isAdmin = (user.email || '').toLowerCase() === OWNER_ADMIN_EMAIL.toLowerCase();
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 30); // 30 días por defecto

            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || user.email?.split('@')[0] || 'Usuario',
              photoURL: user.photoURL || '',
              role: isAdmin ? 'admin' : 'user',
              subscriptionTier: isAdmin ? 'premium' : 'free',
              subscribedPacks: [],
              subscriptionExpiry: expiryDate.toISOString(),
              activeDevices: [deviceId]
            };
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, 'users/' + user.uid);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAuthReady }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
