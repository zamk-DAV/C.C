import React, { createContext, useContext, useEffect, useState } from 'react';
import { type User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
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
                    console.log("[Auth] Firestore response received:", docSnap.exists());
                    if (docSnap.exists()) {
                        const data = docSnap.data() as UserData;
                        console.log("[Auth] userData loaded, coupleId:", data.coupleId);
                        setUserData(data);

                        // LOCK LOGIC: If passcode exists and app hasn't been unlocked yet
                        if (data.passcode && loading) { // Only lock on initial load
                            setIsLocked(true);
                        }

                        if (!data.coupleId) {
                            console.log("[Auth] No coupleId, ending loading");
                            setLoading(false);
                            setCoupleData(null); // Reset couple data if disconnected
                        }
                    } else {
                        console.log("[Auth] User document does not exist");
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
                    setCoupleData(docSnap.data() as CoupleData);
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

    // Safety Timeout
    useEffect(() => {
        const timer = setTimeout(() => {
            if (loading) {
                console.warn("Loading timed out. Forcing stop.");
                setLoading(false);
            }
        }, 3000);
        return () => clearTimeout(timer);
    }, [loading]);

    const unlockApp = () => setIsLocked(false);

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
