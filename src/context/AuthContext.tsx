import React, { createContext, useContext, useEffect, useState } from 'react';
import { type User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { UserData } from '../types';
import { LoadingScreen } from '../components/common/LoadingScreen';

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
                        const data = docSnap.data() as UserData;
                        setUserData(data);
                        // If user has no coupleId, end loading immediately
                        // (Partner data useEffect won't trigger properly for this case)
                        if (!data.coupleId) {
                            setLoading(false);
                        }
                        // If coupleId exists, the second useEffect will handle loading
                    } else {
                        // Handle case where auth exists but firestore doc doesn't (rare, maybe mid-signup)
                        setUserData(null);
                        setLoading(false);
                    }
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

    // Safety Timeout: Force stop loading after 8 seconds to prevent infinite hang
    useEffect(() => {
        const timer = setTimeout(() => {
            if (loading) {
                console.warn("Loading timed out. Forcing render.");
                setLoading(false);
            }
        }, 8000); // 8 seconds timeout

        return () => clearTimeout(timer);
    }, [loading]);

    const value = {
        user,
        userData,
        partnerData,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <LoadingScreen />
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};
