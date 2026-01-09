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
        let unsubscribeUser: (() => void) | undefined;

        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            // Clean up previous subscription if exists
            if (unsubscribeUser) {
                unsubscribeUser();
                unsubscribeUser = undefined;
            }

            if (firebaseUser) {
                setUser(firebaseUser);
                const userRef = doc(db, 'users', firebaseUser.uid);

                // Subscribe to User Data
                unsubscribeUser = onSnapshot(userRef, (docSnap) => {
                    console.log("[Auth] Firestore response received:", docSnap.exists());
                    if (docSnap.exists()) {
                        const data = docSnap.data() as UserData;
                        console.log("[Auth] userData loaded, coupleId:", data.coupleId);
                        setUserData(data);
                        // If user has no coupleId, end loading immediately
                        // (Partner data useEffect won't trigger properly for this case)
                        if (!data.coupleId) {
                            console.log("[Auth] No coupleId, ending loading");
                            setLoading(false);
                        }
                        // If coupleId exists, the second useEffect will handle loading
                    } else {
                        // Handle case where auth exists but firestore doc doesn't (rare, maybe mid-signup)
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
                setLoading(false);
            }
        });

        return () => {
            if (unsubscribeUser) {
                unsubscribeUser();
            }
            unsubscribe();
        };
    }, []);

    // Fetch Partner Data when userData changes
    useEffect(() => {
        if (user && userData?.coupleId) {
            const q = query(
                collection(db, 'users'),
                where('coupleId', '==', userData.coupleId)
            );

            // Using onSnapshot for partner real-time updates too
            const unsubscribePartner = onSnapshot(q, (snapshot) => {
                if (!snapshot.empty) {
                    // Filter out current user to find partner
                    const partnerDoc = snapshot.docs.find(doc => doc.data().uid !== user.uid);
                    if (partnerDoc) {
                        setPartnerData(partnerDoc.data() as UserData);
                    } else {
                        setPartnerData(null);
                    }
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

    // Safety Timeout: Force stop loading after 3 seconds to prevent infinite hang
    useEffect(() => {
        const timer = setTimeout(() => {
            if (loading) {
                console.warn("Loading timed out. Forcing render. Current state:", { user: !!user, userData: !!userData });
                setLoading(false);
            }
        }, 3000); // 3 seconds timeout (reduced from 8)

        return () => clearTimeout(timer);
    }, [loading, user, userData]);

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
