import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

type ThemeName =
    | 'default'
    | 'apple'
    | 'forest-friends'
    | 'clay'
    | 'calico-cat'
    | 'morning-glow'
    | 'pastel'
    | 'purple-milktea'
    | 'modern-house'
    | 'grayscale'
    | 'everest-night'
    | 'dark-mode';

interface ThemeContextType {
    theme: ThemeName;
    setTheme: (theme: ThemeName) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within a ThemeProvider');
    return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<ThemeName>('default');
    const { user, userData } = useAuth();
    const [isInitialized, setIsInitialized] = useState(false);

    // 1. Initial Load from LocalStorage
    useEffect(() => {
        const savedTheme = localStorage.getItem('dear23-theme') as ThemeName;
        if (savedTheme) {
            applyTheme(savedTheme);
        } else {
            // System preference check could go here if we wanted auto-dark
            applyTheme('default');
        }
        setIsInitialized(true);
    }, []);

    // 2. Sync with Firestore (User Data) - Priority over LocalStorage if changed elsewhere
    const firestoreTheme = userData?.theme;
    useEffect(() => {
        if (firestoreTheme && firestoreTheme !== theme) {
            applyTheme(firestoreTheme as ThemeName);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [firestoreTheme]);

    const applyTheme = (newTheme: ThemeName) => {
        const root = document.documentElement;
        if (newTheme === 'default') {
            root.removeAttribute('data-theme');
        } else {
            root.setAttribute('data-theme', newTheme);
        }
        setThemeState(newTheme);
        localStorage.setItem('dear23-theme', newTheme);
    };

    const setTheme = async (newTheme: ThemeName) => {
        // Optimistic Update
        applyTheme(newTheme);

        // Persist to Firestore if logged in
        if (user) {
            try {
                await updateDoc(doc(db, 'users', user.uid), {
                    theme: newTheme
                });
            } catch (error) {
                console.error("Failed to save theme to Firestore:", error);
                // No rollback needed for theme usually, it's fine to be local-first
            }
        }
    };

    if (!isInitialized) return null; // Or a loading spinner

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
