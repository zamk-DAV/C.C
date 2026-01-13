import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";
import * as cors from "cors";

admin.initializeApp();
// Deploy Timestamp: 2026-01-13 11:35

const corsHandler = cors({ origin: true });

// Interface for cleaned up memory object
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
    authorId?: string; // Added for UID based filtering
    images?: string[];
}

export const getNotionDatabase = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        // [DEBUG] Log incoming request
        console.log("[DEBUG] Request Body:", JSON.stringify(req.body));

        // 1. Verify Authentication
        const tokenId = req.headers.authorization?.split("Bearer ")[1];
        if (!tokenId) {
            res.status(401).send({ error: "Unauthorized" });
            return;
        }

        try {
            const decodedToken = await admin.auth().verifyIdToken(tokenId);
            const uid = decodedToken.uid;

            // Allow requesting a specific user's data (e.g., partner) if provided, otherwise self
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
            const { startCursor } = req.body;
            const notionResponse = await axios.post(
                `https://api.notion.com/v1/databases/${databaseId}/query`,
                {
                    page_size: 20, // Default to 20
                    start_cursor: (typeof startCursor === 'string' && startCursor.length > 0) ? startCursor : undefined,
                    filter: req.body.filterType ? {
                        property: "dear23_카테고리",
                        select: {
                            equals:
                                req.body.filterType === 'Diary' ? '일기' :
                                    req.body.filterType === 'Memory' ? '추억' :
                                        req.body.filterType === 'Event' ? '일정' :
                                            req.body.filterType === 'Letter' ? '편지' : '일기'
                        }
                    } : undefined,
                    sorts: [
                        {
                            property: "dear23_날짜",
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
            if (results.length > 0) {
                console.log("[DEBUG_KEYS] Notion Properties:", JSON.stringify(Object.keys(results[0].properties)));
            }
            const memories: MemoryItem[] = results.map((page: any) => {
                const props = page.properties;

                // Extract Title
                const titleList = props["Name"]?.title || props["이름"]?.title || props["title"]?.title || [];
                const title = titleList.length > 0 ? titleList[0].plain_text : "Untitled";

                // Extract Date
                const dateProp = props["dear23_날짜"]?.date || props["Date"]?.date || props["날짜"]?.date || props["date"]?.date;
                const date = dateProp ? dateProp.start : "";

                // Extract Images (Files & Media property: 'dear23_대표이미지')
                const fileProp = props["dear23_대표이미지"]?.files || [];
                const images: string[] = [];

                if (fileProp.length > 0) {
                    fileProp.forEach((f: any) => {
                        if (f.type === "file") {
                            images.push(f.file.url);
                        } else if (f.type === "external") {
                            images.push(f.external.url);
                        }
                    });
                }

                const coverImage = images.length > 0 ? images[0] : null;


                // Extract Preview Text (Text property: 'dear23_내용미리보기')
                const previewList = props["dear23_내용미리보기"]?.rich_text || [];
                const previewText = previewList.length > 0 ? previewList[0].plain_text : "";

                // Extract Author (Select property: '작성자')
                const authorSelect = props["작성자"]?.select;
                let author = "상대방";
                if (authorSelect) {
                    author = authorSelect.name;
                }

                // Extract Author ID (Text property: 'dear23_authorId')
                const authorIdList = props["dear23_authorId"]?.rich_text || [];
                const authorId = authorIdList.length > 0 ? authorIdList[0].plain_text : undefined;

                // Extract Mood (Select property: 'dear23_기분')
                const mood = props["dear23_기분"]?.select?.name;

                // Extract Weather (Select property: 'dear23_날씨')
                const weather = props["dear23_날씨"]?.select?.name;

                return {
                    id: page.id,
                    title,
                    date,
                    coverImage,
                    previewText,
                    author,
                    authorId,
                    mood,
                    weather,
                    images
                };
            });

            res.status(200).send({
                data: memories,
                hasMore: notionResponse.data.has_more,
                nextCursor: notionResponse.data.next_cursor,
                debug_properties: results.length > 0 ? Object.keys(results[0].properties) : []
            });

        } catch (error: any) {
            console.error("Error fetching Notion data:", error);
            if (error.response) {
                console.error("Notion API Error Response:", JSON.stringify(error.response.data));
            }
            res.status(500).send({ error: error.message });
        }
    });
});

export const searchNotionDatabases = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
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

export const createDiaryEntry = functions.https.onRequest((req, res) => {
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

            // 2. Fetch Notion Config
            const userDoc = await admin.firestore().collection("users").doc(uid).get();
            const userData = userDoc.data();

            if (!userData || !userData.notionConfig) {
                res.status(404).send({ error: "Notion configuration not found." });
                return;
            }

            const { apiKey, databaseId } = userData.notionConfig;

            // 3. Prepare Notion Page Properties
            const { title, content, type, date, mood, weather, images } = req.body; // type: 'Diary' | 'Memory' | ...

            // Upload Images to Firebase Storage if present
            const imageUrls: string[] = [];

            if (images && Array.isArray(images) && images.length > 0) {
                try {
                    const bucket = admin.storage().bucket();

                    // Upload concurrently
                    await Promise.all(images.map(async (img: any, idx: number) => {
                        if (img.base64) {
                            const buffer = Buffer.from(img.base64.split(',')[1], 'base64');
                            const filename = `memories/${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 9)}.${img.type?.split('/')[1] || 'jpg'}`;
                            const file = bucket.file(filename);

                            await file.save(buffer, {
                                metadata: { contentType: img.type || 'image/jpeg' },
                                public: true,
                            });

                            // Generate Signed URL valid for a long time
                            const [url] = await file.getSignedUrl({
                                action: 'read',
                                expires: '01-01-2100'
                            });
                            imageUrls.push(url);
                        }
                    }));
                    console.log(`[Storage] Uploaded ${imageUrls.length} images.`);
                } catch (storageError: any) {
                    console.error("[Storage] Failed to upload images:", storageError);
                }
            }

            let categoryValue = "일기"; // Default
            switch (type) {
                case 'Diary': categoryValue = '일기'; break;
                case 'Memory': categoryValue = '추억'; break;
                case 'Event': categoryValue = '일정'; break;
                case 'Letter': categoryValue = '편지'; break;
            }

            // Use provided date or fallback to today
            const entryDate = date || new Date().toISOString().split('T')[0];

            // Prepare Notion Page Properties Object
            const properties = {
                "이름": {
                    title: [
                        {
                            text: {
                                content: title || "Untitled"
                            }
                        }
                    ]
                },
                "dear23_카테고리": {
                    select: {
                        name: categoryValue
                    }
                },
                "dear23_날짜": {
                    date: {
                        start: entryDate
                    }
                },
                "dear23_내용미리보기": {
                    rich_text: [
                        {
                            text: {
                                content: content ? content.substring(0, 1000) : ""
                            }
                        }
                    ]
                },
                "dear23_기분": mood ? {
                    select: {
                        name: mood
                    }
                } : undefined,
                "dear23_날씨": weather ? {
                    select: {
                        name: weather
                    }
                } : undefined,
                "작성자": req.body.sender ? {
                    select: {
                        name: req.body.sender
                    }
                } : undefined,
                "dear23_authorId": {
                    rich_text: [
                        {
                            text: {
                                content: uid // Save the User UID
                            }
                        }
                    ]
                },
                "dear23_대표이미지": imageUrls.length > 0 ? {
                    files: imageUrls.map(url => ({
                        name: "image",
                        type: "external",
                        external: { url: url }
                    }))
                } : undefined
            };

            // 4. Create Page in Notion with Retry Logic
            try {
                const response = await axios.post(
                    "https://api.notion.com/v1/pages",
                    {
                        parent: { database_id: databaseId },
                        properties: properties,
                    },
                    {
                        headers: {
                            "Authorization": `Bearer ${apiKey}`,
                            "Notion-Version": "2022-06-28",
                            "Content-Type": "application/json",
                        },
                    }
                );
                res.status(200).send({ data: response.data });
            } catch (firstError: any) {
                console.error("First attempt failed:", firstError.message);

                if (firstError.response?.status === 400) {
                    console.warn("Retrying with alternative strategies...");

                    const possibleTitleKeys = ["Name", "title", "제목", "Title"];
                    const currentTitleKey = "이름";
                    let lastError = firstError;

                    for (const altKey of possibleTitleKeys) {
                        try {
                            console.log(`[Retry] Trying with title key: ${altKey}`);
                            const retryProps: any = { ...properties };
                            delete retryProps[currentTitleKey];
                            retryProps[altKey] = properties["이름"];

                            const retryResponse = await axios.post(
                                "https://api.notion.com/v1/pages",
                                {
                                    parent: { database_id: databaseId },
                                    properties: retryProps,
                                },
                                {
                                    headers: {
                                        "Authorization": `Bearer ${apiKey}`,
                                        "Notion-Version": "2022-06-28",
                                        "Content-Type": "application/json",
                                    },
                                }
                            );
                            res.status(200).send({ data: retryResponse.data, warning: `Title key switched to ${altKey}` });
                            return;
                        } catch (retryError: any) {
                            console.warn(`[Retry] Failed with key: ${altKey}`, retryError.message);
                            lastError = retryError;
                        }
                    }

                    console.warn("Final Attempt: Stripping everything except core Notion fields...");
                    try {
                        const minimalProps: any = { ...properties };
                        delete minimalProps["작성자"];
                        delete minimalProps["dear23_날씨"];
                        delete minimalProps["dear23_기분"];
                        delete minimalProps["dear23_authorId"]; // Also remove new prop in minimal retry

                        const finalResponse = await axios.post(
                            "https://api.notion.com/v1/pages",
                            {
                                parent: { database_id: databaseId },
                                properties: minimalProps,
                            },
                            {
                                headers: {
                                    "Authorization": `Bearer ${apiKey}`,
                                    "Notion-Version": "2022-06-28",
                                    "Content-Type": "application/json",
                                },
                            }
                        );
                        res.status(200).send({ data: finalResponse.data, warning: "Saved with minimal properties." });
                    } catch (finalError: any) {
                        res.status(500).send({
                            error: "Failed after all retries",
                            details: finalError.response?.data
                        });
                    }
                } else {
                    res.status(500).send({ error: firstError.message, details: firstError.response?.data });
                }
            }


        } catch (error: any) {
            console.error("Error creating Notion page:", error);
            res.status(500).send({ error: error.message, details: error.response?.data });
        }
    });
});

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

            // 2. Get current database schema
            const dbResponse = await axios.get(
                `https://api.notion.com/v1/databases/${databaseId}`,
                {
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Notion-Version": "2022-06-28",
                    },
                }
            );

            const currentProps = dbResponse.data.properties;
            const created: string[] = [];
            const patchProps: any = {};

            // Helper to check and add/update select property
            const ensureSelect = (name: string, options: string[]) => {
                const existing = currentProps[name];
                if (!existing) {
                    patchProps[name] = {
                        select: {
                            options: options.map(opt => ({ name: opt }))
                        }
                    };
                    created.push(name);
                } else if (existing.type === 'select') {
                    // Check if options are missing
                    const existingOptions = existing.select.options.map((o: any) => o.name);
                    const missingOptions = options.filter(opt => !existingOptions.includes(opt));
                    if (missingOptions.length > 0) {
                        patchProps[name] = {
                            select: {
                                options: [
                                    ...existing.select.options.map((o: any) => ({ name: o.name, color: o.color })),
                                    ...missingOptions.map(opt => ({ name: opt }))
                                ]
                            }
                        };
                        created.push(`${name} (updated)`);
                    }
                }
            };

            // 3. Define and ensure properties
            ensureSelect("dear23_카테고리", ["일기", "추억", "일정", "편지"]);
            ensureSelect("dear23_기분", ["매우 나쁨", "나쁨", "좋음", "매우 좋음", "사랑"]);
            ensureSelect("dear23_날씨", ["맑음", "구름", "비", "눈", "바람"]);

            if (!currentProps["dear23_날짜"]) {
                patchProps["dear23_날짜"] = { date: {} };
                created.push("dear23_날짜");
            }
            if (!currentProps["dear23_내용미리보기"]) {
                patchProps["dear23_내용미리보기"] = { rich_text: {} };
                created.push("dear23_내용미리보기");
            }
            if (!currentProps["dear23_대표이미지"]) {
                patchProps["dear23_대표이미지"] = { files: {} };
                created.push("dear23_대표이미지");
            }
            if (!currentProps["작성자"]) {
                patchProps["작성자"] = { select: {} };
                created.push("작성자");
            }
            // NEW: Ensure 'dear23_authorId' exists
            if (!currentProps["dear23_authorId"]) {
                patchProps["dear23_authorId"] = { rich_text: {} };
                created.push("dear23_authorId");
            }

            // 4. Update Database if needed
            if (Object.keys(patchProps).length > 0) {
                console.log("[Schema] Patching properties:", Object.keys(patchProps));
                await axios.patch(
                    `https://api.notion.com/v1/databases/${databaseId}`,
                    { properties: patchProps },
                    {
                        headers: {
                            "Authorization": `Bearer ${apiKey}`,
                            "Notion-Version": "2022-06-28",
                            "Content-Type": "application/json",
                        },
                    }
                );
            }

            res.status(200).send({ status: "success", created });

        } catch (error: any) {
            console.error("Schema validation failed:", error);
            if (error.response) {
                console.error("Notion API Error:", JSON.stringify(error.response.data));
            }
            res.status(500).send({
                error: error.message,
                details: error.response?.data
            });
        }
    });
});

export const deleteDiaryEntry = functions.https.onRequest((req, res) => {
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

            // 2. Fetch Notion Config
            const userDoc = await admin.firestore().collection("users").doc(uid).get();
            const userData = userDoc.data();

            if (!userData || !userData.notionConfig) {
                res.status(404).send({ error: "Notion configuration not found." });
                return;
            }

            const { apiKey } = userData.notionConfig;

            // 3. Archive Page
            const { pageId } = req.body;
            if (!pageId) {
                res.status(400).send({ error: "Page ID is required." });
                return;
            }

            const response = await axios.patch(
                `https://api.notion.com/v1/pages/${pageId}`,
                { archived: true },
                {
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Notion-Version": "2022-06-28",
                        "Content-Type": "application/json",
                    },
                }
            );

            res.status(200).send({ data: response.data });

        } catch (error: any) {
            console.error("Error deleting Notion page:", error);
            res.status(500).send({ error: error.message });
        }
    });
});

export const updateDiaryEntry = functions.https.onRequest((req, res) => {
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

            // 2. Fetch Notion Config
            const userDoc = await admin.firestore().collection("users").doc(uid).get();
            const userData = userDoc.data();

            if (!userData || !userData.notionConfig) {
                res.status(404).send({ error: "Notion configuration not found." });
                return;
            }

            const { apiKey } = userData.notionConfig;

            // 3. Prepare Update Data
            const { pageId, title, content, mood, weather, date } = req.body;

            if (!pageId) {
                res.status(400).send({ error: "Page ID is required" });
                return;
            }

            const properties: any = {
                "Name": title ? {
                    title: [
                        {
                            text: {
                                content: title
                            }
                        }
                    ]
                } : undefined,
                "dear23_날짜": date ? {
                    date: {
                        start: date
                    }
                } : undefined,
                "dear23_내용미리보기": content ? {
                    rich_text: [
                        {
                            text: {
                                content: content.substring(0, 1000)
                            }
                        }
                    ]
                } : undefined,
                "dear23_기분": mood ? {
                    select: {
                        name: mood
                    }
                } : undefined,
                "dear23_날씨": weather ? {
                    select: {
                        name: weather
                    }
                } : undefined,
                // Update AuthorId if missing? Usually we don't change author info on edit. 
                // But we could enforce it if we want to "claim" it. 
                // Let's stick to content updates for now to avoid side effects.
            };

            // Remove undefined keys
            Object.keys(properties).forEach(key => properties[key] === undefined && delete properties[key]);

            // 4. Update Page in Notion
            const response = await axios.patch(
                `https://api.notion.com/v1/pages/${pageId}`,
                {
                    properties: properties
                },
                {
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Notion-Version": "2022-06-28",
                        "Content-Type": "application/json",
                    },
                }
            );

            res.status(200).send({ data: response.data });

        } catch (error: any) {
            console.error("Error updating Notion page:", error);
            res.status(500).send({ error: error.message });
        }
    });
});
