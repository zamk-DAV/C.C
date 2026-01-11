import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Initialize Firebase Admin (lazy load with error handling)
    if (getApps().length === 0) {
        try {
            const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

            if (!serviceAccountKey) {
                console.error("Missing FIREBASE_SERVICE_ACCOUNT_KEY env var");
                return res.status(500).json({ error: 'Server Config Error: Missing FIREBASE_SERVICE_ACCOUNT_KEY' });
            }

            // Handle potential JSON parsing error
            let serviceAccount: ServiceAccount;
            try {
                serviceAccount = JSON.parse(serviceAccountKey);
            } catch (e) {
                console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY", e);
                return res.status(500).json({ error: 'Server Config Error: Invalid JSON in FIREBASE_SERVICE_ACCOUNT_KEY' });
            }

            initializeApp({
                credential: cert(serviceAccount),
            });
        } catch (error: any) {
            console.error("Firebase Admin Init Error:", error);
            return res.status(500).json({ error: `Firebase Admin Init Failed: ${error.message}` });
        }
    }

    const { tokens, title, body, icon } = req.body;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
        return res.status(400).json({ error: 'Missing tokens' });
    }

    try {
        const message = {
            notification: {
                title: title || 'New Message',
                body: body || 'You have a new message!',
            },
            tokens: tokens,
            webpush: {
                fcmOptions: {
                    link: 'https://c-c-mauve.vercel.app/chat'
                }
            }
        };

        const response = await getMessaging().sendMulticast(message);
        return res.status(200).json({ success: true, response });

    } catch (error: any) {
        console.error('Error sending message:', error);
        return res.status(500).json({ error: `Failed to send notification: ${error.message}` });
    }
}
