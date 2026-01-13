import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { UserData, CoupleData } from '../types';

interface AuthContextType {
    user: User | null;
    userData: UserData | null;
    partnerData: UserData | null;
    coupleData: CoupleData | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userData: null,
    partnerData: null,
    coupleData: null,
    loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [partnerData, setPartnerData] = useState<UserData | null>(null);
    const [coupleData, setCoupleData] = useState<CoupleData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                const userRef = doc(db, 'users', firebaseUser.uid);

                const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setUserData(docSnap.data() as UserData);
                    } else {
                        setUserData(null);
                        setLoading(false);
                    }
                }, (error) => {
                    console.error("Error fetching user data:", error);
                    setLoading(false);
                });

                return () => unsubscribeUser();
            } else {
                setUser(null);
                setUserData(null);
                setPartnerData(null);
                setCoupleData(null);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    // Fetch Partner and Couple Data when userData changes
    useEffect(() => {
        if (user && userData?.coupleId) {
            // 1. Subscribe to Partner
            const partnerQuery = query(
                collection(db, 'users'),
                where('coupleId', '==', userData.coupleId),
                where('uid', '!=', user.uid)
            );

            const unsubscribePartner = onSnapshot(partnerQuery, (snapshot) => {
                if (!snapshot.empty) {
                    setPartnerData(snapshot.docs[0].data() as UserData);
                } else {
                    setPartnerData(null);
                }
            });

            // 2. Subscribe to Couple Doc
            const coupleRef = doc(db, 'couples', userData.coupleId);
            const unsubscribeCouple = onSnapshot(coupleRef, (docSnap) => {
                if (docSnap.exists()) {
                    setCoupleData({ id: docSnap.id, ...docSnap.data() } as CoupleData);
                } else {
                    setCoupleData(null);
                }
                setLoading(false);
            }, (err) => {
                console.error("Error fetching couple data:", err);
                setLoading(false);
            });

            return () => {
                unsubscribePartner();
                unsubscribeCouple();
            };
        } else if (user && userData && !userData.coupleId) {
            setPartnerData(null);
            setCoupleData(null);
            setLoading(false);
        }
    }, [user, userData?.coupleId]);

    const value = {
        user,
        userData,
        partnerData,
        coupleData,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
