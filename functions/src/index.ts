import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";
import * as cors from "cors";

admin.initializeApp();

const corsHandler = cors({ origin: true });

// Interface for Cleaned up Memory Object
interface MemoryItem {
    id: string;
    title: string;
    date: string;
    coverImage: string | null;
    previewText: string;
    type?: string;
    sender?: string;
    isRead?: boolean;
    author?: string;
}

export const getNotionDatabase = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        // 1. Verify Authentication
        const tokenId = req.headers.authorization?.split("Bearer ")[1];
        if (!tokenId) {
            res.status(401).send({ error: "Unauthorized" });
            return;
        }

        try {
            const decodedToken = await admin.auth().verifyIdToken(tokenId);
            const uid = decodedToken.uid;

            const targetUserId = req.body.targetUserId || uid;

            // 2. Fetch Notion Config from Firestore
            const userDoc = await admin.firestore().collection("users").doc(targetUserId).get();
            const userData = userDoc.data();

            if (!userData || !userData.notionConfig) {
                res.status(404).send({ error: "Notion configuration not found for this user." });
                return;
            }

            const { apiKey, databaseId } = userData.notionConfig;

            if (!apiKey || !databaseId) {
                res.status(400).send({ error: "Incomplete Notion configuration." });
                return;
            }

            // 3. Query Notion API
            const { startCursor, pageSize } = req.body;
            const limit = pageSize && typeof pageSize === 'number' ? pageSize : 20;

            const notionResponse = await axios.post(
                `https://api.notion.com/v1/databases/${databaseId}/query`,
                {
                    page_size: limit,
                    start_cursor: (typeof startCursor === 'string' && startCursor.length > 0) ? startCursor : undefined,
                    sorts: [
                        {
                            property: "날짜",
                            direction: "descending"
                        }
                    ]
                },
                {
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Notion-Version": "2022-06-28",
                        "Content-Type": "application/json",
                    },
                }
            );

            // 4. Transform Data
            const results = notionResponse.data.results;
            const memories: MemoryItem[] = results.map((page: any) => {
                const props = page.properties;

                // Extract Title
                const titleList = props["Name"]?.title || props["이름"]?.title || props["title"]?.title || [];
                const title = titleList.length > 0 ? titleList[0].plain_text : "Untitled";

                // Extract Date
                const dateProp = props["Date"]?.date || props["날짜"]?.date || props["date"]?.date;
                const date = dateProp ? dateProp.start : "";

                // Extract Cover Image (Files & Media property: 'dear23_대표이미지')
                const fileProp = props["dear23_대표이미지"]?.files || [];
                let images: string[] = [];
                if (fileProp.length > 0) {
                    fileProp.forEach((file: any) => {
                        if (file.type === "file") {
                            images.push(file.file.url);
                        } else if (file.type === "external") {
                            images.push(file.external.url);
                        }
                    });
                }
                const coverImage = images.length > 0 ? images[0] : null;

                // Extract Preview Text (Text property: 'dear23_내용미리보기')
                const previewList = props["dear23_내용미리보기"]?.rich_text || [];
                const previewText = previewList.length > 0 ? previewList[0].plain_text : "";

                // Extract Author
                const authorSelect = props["작성자"]?.select;
                let author = "Partner";
                if (authorSelect) {
                    author = authorSelect.name;
                }

                return {
                    id: page.id,
                    title,
                    date,
                    coverImage,
                    images, // Added images array
                    previewText,
                    author
                };
            });

            res.status(200).send({
                data: memories,
                hasMore: notionResponse.data.has_more, // Correct casing
                nextCursor: notionResponse.data.next_cursor
            });

        } catch (error: any) {
            console.error("Error fetching Notion data:", error);
            res.status(500).send({
                error: error.message,
                details: error.response?.data || "No additional details"
            });
        }
    });
});

export const createDiaryEntry = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        const tokenId = req.headers.authorization?.split("Bearer ")[1];
        if (!tokenId) {
            res.status(401).send({ error: "Unauthorized" });
            return;
        }

        try {
            const decodedToken = await admin.auth().verifyIdToken(tokenId);
            const uid = decodedToken.uid;

            const userDoc = await admin.firestore().collection("users").doc(uid).get();
            const userData = userDoc.data();

            if (!userData || !userData.notionConfig) {
                res.status(404).send({ error: "Configuration not found." });
                return;
            }

            const { apiKey, databaseId } = userData.notionConfig;
            const { content, images } = req.body; // images: { base64: string, type: string }[]

            // 1. Upload Images to Notion
            const uploadedFiles = [];
            if (images && images.length > 0) {
                for (const img of images) {
                    // Get Upload URL
                    const initRes = await axios.post(
                        "https://api.notion.com/v1/file_uploads",
                        {
                            content_type: img.type,
                            content_length: img.size
                        },
                        {
                            headers: {
                                "Authorization": `Bearer ${apiKey}`,
                                "Notion-Version": "2022-06-28",
                                "Content-Type": "application/json"
                            }
                        }
                    );

                    const { signed_put_url, url, file_upload } = initRes.data;

                    // Upload File
                    const buffer = Buffer.from(img.base64.split(",")[1], 'base64');
                    await axios.put(signed_put_url, buffer, {
                        headers: { "Content-Type": img.type }
                    });

                    uploadedFiles.push({
                        url: url,
                        id: file_upload.id, // Internal ID
                        name: img.name
                    });
                }
            }

            // 2. Create Page (Construct Internal File Objects for Property)
            // Note: Public API doesn't officially support setting internal files in properties,
            // but we try using the undocumented structure or fallback to External if 'url' works.
            // The user's screenshot used "file_upload": { "id": ... } for BLOCKS.
            // For PROPERTIES, we might just try regular external URL if internal structure fails,
            // but let's try to pass the internal structure if possible.
            // However, sticking to the user's specific block screenshot for content.

            // For the Feed Property (Files & Media), we often need standard external objects unless we reverse engineer the property update.
            // SAFE BET: Use the 'url' returned by Notion (which is an AWS S3 link) as an 'external' file type for the property.
            // It expires, but Notion API might be smart enough? No, Notion Authenticated URLs expire.
            // The best way for persistent access in Feed is creating the entry with BLOCKS, 
            // and letting the Notion 'Files' property be manually populated? No, we need it auto.
            // Let's rely on the strategy: Add to 'Files & Media' property as 'External' (using the link) 
            // AND Add to 'Content' as 'file_upload' block (using the ID).

            // const filePropertyItems = uploadedFiles.map(f => ({
            //     name: f.name || "image.png",
            //     external: { url: f.url } // This URL is valid for signed duration.
            // }));

            // Wait, if it expires, the feed will break after 1 hour.
            // The user wants a robust solution.
            // Internal file uploads in blocks don't expire securely? They do, but Notion refreshes them.
            // If we add it as a BLOCK, we can fetch page blocks. But we only fetch Database Props.
            // Correct approach: If we use `v1/file_uploads`, we get an ID.
            // Can we populate the property with THAT ID?
            // "type": "file", "file": { "id": "..." } ??
            // Using logic from user screenshot for BLOCKS clearly.

            const childrenBlocks = uploadedFiles.map(f => ({
                type: "image",
                image: {
                    type: "file_upload",
                    file_upload: { id: f.id }
                }
            }));

            // Also add content text
            if (content) {
                childrenBlocks.unshift({
                    object: "block",
                    type: "paragraph",
                    paragraph: {
                        rich_text: [{ type: "text", text: { content: content } }]
                    }
                } as any);
            }

            await axios.post(
                "https://api.notion.com/v1/pages",
                {
                    parent: { database_id: databaseId },
                    properties: {
                        "Name": { title: [{ text: { content: content ? content.slice(0, 20) : "Diary" } }] },
                        "Date": { date: { start: new Date().toISOString().split('T')[0] } },
                        "dear23_내용미리보기": { rich_text: [{ text: { content: content || "" } }] },
                        // "dear23_대표이미지": { files: filePropertyItems }
                        // Ideally we leave this empty and let user drag? No.
                        // Let's try to add the same 'file_upload' structure to the property?
                        // If it fails, we catch.
                    },
                    children: childrenBlocks
                },
                {
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Notion-Version": "2022-06-28",
                        "Content-Type": "application/json"
                    }
                }
            );

            res.status(200).send({ success: true });

        } catch (error: any) {
            console.error("Error creating diary:", error);
            res.status(500).send({ error: error.message, details: error.response?.data });
        }
    });
});

export const searchNotionDatabases = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        // ... (existing search code)
        // Re-copying existing functionality to ensure no loss
        // 1. Verify Authentication
        const tokenId = req.headers.authorization?.split("Bearer ")[1];
        if (!tokenId) {
            res.status(401).send({ error: "Unauthorized" });
            return;
        }

        try {
            await admin.auth().verifyIdToken(tokenId);

            // 2. Get API Key from request body
            const { apiKey } = req.body;
            if (!apiKey) {
                res.status(400).send({ error: "API Key is required." });
                return;
            }

            // 3. Search Notion API for Databases
            const notionResponse = await axios.post(
                "https://api.notion.com/v1/search",
                {
                    filter: {
                        value: "database",
                        property: "object"
                    },
                    page_size: 100
                },
                {
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Notion-Version": "2022-06-28",
                        "Content-Type": "application/json",
                    },
                }
            );

            // 4. Return simplified list
            const databases = notionResponse.data.results.map((db: any) => ({
                id: db.id,
                title: db.title?.[0]?.plain_text || "Untitled Database",
                url: db.url,
                icon: db.icon
            }));

            res.status(200).send({ data: databases });

        } catch (error: any) {
            console.error("Error searching Notion databases:", error);
            res.status(500).send({ error: error.message });
        }
    });
});
// ... (existing code)

export const validateNotionSchema = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        // 1. Verify Authentication
        const tokenId = req.headers.authorization?.split("Bearer ")[1];
        if (!tokenId) {
            res.status(401).send({ error: "Unauthorized" });
            return;
        }

        try {
            await admin.auth().verifyIdToken(tokenId);

            const { apiKey, databaseId } = req.body;
            if (!apiKey || !databaseId) {
                res.status(400).send({ error: "API Key and Database ID are required." });
                return;
            }

            // 2. Define Required Schema
            const requiredProperties: any = {
                // Common
                "날짜": { date: {} },
                "구분": { select: { options: [{ name: "일기", color: "blue" }, { name: "일정", color: "green" }, { name: "편지", color: "pink" }, { name: "추억", color: "yellow" }] } },
                "작성자": { select: {} },
                "내용미리보기": { rich_text: {} },
                "나만보기": { checkbox: {} },
                "좋아요": { checkbox: {} },
                "작성일시": { created_time: {} },
                "수정일시": { last_edited_time: {} },

                // Diary
                "dear23_대표이미지": { files: {} }, // '대표이미지' might conflict if user names it differently, sticking to safe key or user friendly name? user friendly name '대표이미지' is better but collision risk. Let's use '대표이미지' as per plan.
                "대표이미지": { files: {} },
                "기분": { select: { options: [{ name: "행복", color: "yellow" }, { name: "슬픔", color: "blue" }, { name: "화남", color: "red" }, { name: "보통", color: "gray" }] } },
                "날씨": { select: { options: [{ name: "맑음", color: "orange" }, { name: "흐림", color: "gray" }, { name: "비", color: "blue" }, { name: "눈", color: "default" }] } },
                "상대방한마디": { rich_text: {} },

                // Calendar
                "함께하기": { checkbox: {} },
                "중요": { checkbox: {} },
                "장소": { rich_text: {} },

                // Letter
                "읽음": { checkbox: {} },
                "개봉일": { date: {} }
            };

            // 3. Fetch Current Schema
            const dbResponse = await axios.get(
                `https://api.notion.com/v1/databases/${databaseId}`,
                {
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Notion-Version": "2022-06-28",
                    },
                }
            );

            const currentProperties = dbResponse.data.properties;
            const propertiesToCreate: any = {};
            const missingList: string[] = [];

            // 4. Check for missing properties
            for (const [name, config] of Object.entries(requiredProperties)) {
                if (!currentProperties[name]) {
                    propertiesToCreate[name] = config;
                    missingList.push(name);
                }
            }

            // 5. Update Database if needed
            if (Object.keys(propertiesToCreate).length > 0) {
                await axios.patch(
                    `https://api.notion.com/v1/databases/${databaseId}`,
                    { properties: propertiesToCreate },
                    {
                        headers: {
                            "Authorization": `Bearer ${apiKey}`,
                            "Notion-Version": "2022-06-28",
                            "Content-Type": "application/json",
                        },
                    }
                );
                res.status(200).send({ status: "updated", created: missingList });
            } else {
                res.status(200).send({ status: "ok", message: "Schema is already perfect!" });
            }

        } catch (error: any) {
            console.error("Error validating Notion schema:", error.response?.data || error);
            res.status(500).send({ error: error.message, details: error.response?.data });
        }
    });
});
