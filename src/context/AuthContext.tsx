import React, { createContext, useContext, useEffect, useState } from 'react';
import { type User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { UserData, CoupleData } from '../types';
import { LoadingScreen } from '../components/common/LoadingScreen';

interface AuthContextType {
    user: User | null;
    userData: UserData | null;
    partnerData: UserData | null;
    coupleData: CoupleData | null;
    loading: boolean;
    isLocked: boolean;
    unlockApp: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userData: null,
    partnerData: null,
    coupleData: null,
    loading: true,
    isLocked: false,
    unlockApp: () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [partnerData, setPartnerData] = useState<UserData | null>(null);
    const [coupleData, setCoupleData] = useState<CoupleData | null>(null);
    const [loading, setLoading] = useState(true);

    const [isLocked, setIsLocked] = useState(false);

    useEffect(() => {
        let unsubscribeUser: (() => void) | undefined;

        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (unsubscribeUser) {
                unsubscribeUser();
                unsubscribeUser = undefined;
            }

            if (firebaseUser) {
                setUser(firebaseUser);
                const userRef = doc(db, 'users', firebaseUser.uid);

                unsubscribeUser = onSnapshot(userRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data() as UserData;
                        setUserData(data);

                        // LOCK LOGIC: If passcode exists and app hasn't been unlocked yet
                        if (data.passcode && loading) { // Only lock on initial load
                            const sessionUnlocked = sessionStorage.getItem('app_unlocked');
                            if (sessionUnlocked !== 'true') {
                                setIsLocked(true);
                            }
                        }

                        if (!data.coupleId || data.email?.startsWith('test_gesture')) {
                            setLoading(false);
                            setCoupleData(null);
                        }
                    } else {
                        setUserData(null);
                        setLoading(false);
                    }
                }, (error) => {
                    console.error("[Auth] Error fetching user data:", error);
                    setLoading(false);
                });
            } else {
                setUser(null);
                setUserData(null);
                setPartnerData(null);
                setCoupleData(null);
                setLoading(false);
                setIsLocked(false);
                sessionStorage.removeItem('app_unlocked');
            }
        });

        return () => {
            if (unsubscribeUser) unsubscribeUser();
            unsubscribe();
        };
    }, []); // Run once on mount

    // Fetch Partner Data & Couple Data when userData changes
    useEffect(() => {
        if (user && userData?.coupleId) {
            // ... (rest of partner/couple fetching logic) ...
            // 1. Fetch Partner Data
            const qUser = query(
                collection(db, 'users'),
                where('coupleId', '==', userData.coupleId)
            );

            const unsubscribePartner = onSnapshot(qUser, (snapshot) => {
                if (!snapshot.empty) {
                    const partnerDoc = snapshot.docs.find(doc => doc.data().uid !== user.uid);
                    if (partnerDoc) {
                        setPartnerData(partnerDoc.data() as UserData);
                    } else {
                        setPartnerData(null);
                    }
                } else {
                    setPartnerData(null);
                }
            }, (error) => console.error("Error fetching partner data:", error));

            // 2. Fetch Couple Data
            const coupleRef = doc(db, 'couples', userData.coupleId);
            const unsubscribeCouple = onSnapshot(coupleRef, (docSnap) => {
                if (docSnap.exists()) {
                    setCoupleData({ id: docSnap.id, ...docSnap.data() } as CoupleData);
                } else {
                    console.log("Couple document not found");
                    setCoupleData(null);
                }
                setLoading(false); // Fully loaded after checking couple doc
            }, (error) => {
                console.error("Error fetching couple data:", error);
                setLoading(false);
            });

            return () => {
                unsubscribePartner();
                unsubscribeCouple();
            };
        } else if (user && userData && !userData.coupleId) {
            setLoading(false);
        }
    }, [user, userData?.coupleId]);

    // Global Presence Logic (Item 1)
    useEffect(() => {
        if (!user?.uid) return;

        const userRef = doc(db, 'users', user.uid);
        let isActive = true;

        const updatePresence = (online: boolean) => {
            if (!user?.uid) return;
            updateDoc(userRef, {
                isChatActive: online, // Reuse this field for global online status as per user request
                lastActive: serverTimestamp()
            }).catch(err => console.error("[Auth] Presence update failed:", err));
        };

        const handleVisibilityChange = () => {
            const nextActive = document.visibilityState === 'visible';
            if (nextActive !== isActive) {
                isActive = nextActive;
                updatePresence(isActive);
            }
        };

        const handleBeforeUnload = () => {
            updatePresence(false);
        };

        // Initial check
        updatePresence(document.visibilityState === 'visible');

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            updatePresence(false);
        };
    }, [user?.uid]);

    const unlockApp = () => {
        sessionStorage.setItem('app_unlocked', 'true');
        setIsLocked(false);
    };

    const value = {
        user,
        userData,
        partnerData,
        coupleData,
        loading,
        isLocked,
        unlockApp
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? <LoadingScreen /> : children}
        </AuthContext.Provider>
    );
};
