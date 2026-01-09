import React, { createContext, useContext, useEffect, useState } from 'react';
import { type User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { UserData } from '../types';

interface AuthContextType {
    user: User | null;
    userData: UserData | null;
    partnerData: UserData | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userData: null,
    partnerData: null,
    loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [partnerData, setPartnerData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                const userRef = doc(db, 'users', firebaseUser.uid);

                // Subscribe to User Data
                const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setUserData(docSnap.data() as UserData);
                    } else {
                        // Handle case where auth exists but firestore doc doesn't (rare, maybe mid-signup)
                        setUserData(null);
                    }
                    // We don't set loading false here because we might need partner data
                    // But for initial load, user auth is enough to stop "loading" for the auth check
                    if (!docSnap.exists()) setLoading(false);
                }, (error) => {
                    console.error("Error fetching user data:", error);
                    setLoading(false);
                });

                return () => {
                    unsubscribeUser();
                };
            } else {
                setUser(null);
                setUserData(null);
                setPartnerData(null);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    // Fetch Partner Data when userData changes
    useEffect(() => {
        if (user && userData?.coupleId) {
            const q = query(
                collection(db, 'users'),
                where('coupleId', '==', userData.coupleId),
                where('uid', '!=', user.uid)
            );

            // Using onSnapshot for partner real-time updates too
            const unsubscribePartner = onSnapshot(q, (snapshot) => {
                if (!snapshot.empty) {
                    setPartnerData(snapshot.docs[0].data() as UserData);
                } else {
                    setPartnerData(null);
                }
                setLoading(false); // Fully loaded
            }, (error) => {
                console.error("Error fetching partner data:", error);
                setLoading(false);
            });

            return () => unsubscribePartner();
        } else if (user && userData && !userData.coupleId) {
            setLoading(false); // User loaded, no couple
        }
    }, [user, userData?.coupleId]);

    const value = {
        user,
        userData,
        partnerData,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div className="flex items-center justify-center min-h-[100dvh] bg-white dark:bg-black">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-4 border-gray-200 border-t-black dark:border-zinc-800 dark:border-t-white rounded-full animate-spin"></div>
                        <p className="text-sm text-gray-500 font-sans animate-pulse">DEAR23 로딩중...</p>
                    </div>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};
