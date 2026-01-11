import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
    // You need to set these environment variables in Vercel
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

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
            tokens: tokens, // Array of device tokens
            webpush: {
                fcmOptions: {
                    link: 'https://c-c-mauve.vercel.app/chat' // Deep link to chat
                }
            }
        };

        const response = await admin.messaging().sendMulticast(message);
        return res.status(200).json({ success: true, response });

    } catch (error) {
        console.error('Error sending message:', error);
        return res.status(500).json({ error: 'Failed to send notification' });
    }
}
