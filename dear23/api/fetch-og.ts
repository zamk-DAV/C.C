import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.statusText}`);
        }

        const html = await response.text();

        const getMetaTag = (property: string) => {
            const regex = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i');
            const match = html.match(regex);
            if (match) return match[1];

            // Try different order of attributes
            const altRegex = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i');
            const altMatch = html.match(altRegex);
            return altMatch ? altMatch[1] : null;
        };

        const getTitle = () => {
            const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
            return titleMatch ? titleMatch[1] : null;
        };

        const ogData = {
            title: getMetaTag('og:title') || getTitle() || url,
            description: getMetaTag('og:description') || getMetaTag('description') || '',
            image: getMetaTag('og:image') || '',
            url: url
        };

        // If it's a relative image URL, we might want to make it absolute, 
        // but for now let's keep it simple.

        return res.status(200).json(ogData);
    } catch (error: any) {
        console.error('OG Fetch Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
