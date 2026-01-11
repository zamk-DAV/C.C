import { useEffect, useState } from 'react';
import { getToken } from 'firebase/messaging';
import { messaging, db, auth, VAPID_KEY } from '../lib/firebase'; // Ensure correct import path
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

const useFcmToken = () => {
    const [notificationPermissionStatus, setNotificationPermissionStatus] = useState('');

    useEffect(() => {
        const retrieveToken = async () => {
            try {
                if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                    const permission = await Notification.requestPermission();
                    setNotificationPermissionStatus(permission);

                    if (permission === 'granted') {
                        const currentToken = await getToken(messaging, {
                            vapidKey: VAPID_KEY,
                        });

                        if (currentToken) {
                            // Save token to user document
                            const user = auth.currentUser;
                            if (user) {
                                const userRef = doc(db, 'users', user.uid);
                                await updateDoc(userRef, {
                                    fcmTokens: arrayUnion(currentToken)
                                });
                            }
                        } else {
                            console.log('No registration token available. Request permission to generate one.');
                        }
                    }
                }
            } catch (error) {
                console.error('An error occurred while retrieving token:', error);
            }
        };

        retrieveToken();
    }, []);

    return { notificationPermissionStatus };
};

export default useFcmToken;
