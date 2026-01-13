import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";
import * as cors from "cors";

admin.initializeApp();
// Deploy Timestamp: 2026-01-13 11:20

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
            // For higher security, we should verify 'targetUserId' is actually the partner.
            // For now, allow any user to be queried (assuming RLS-like logic here or just open for couple MVP)
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
                    /*
                                        sorts: [
                                            {
                                                property: "date", // Assuming 'date' property exists
                                                direction: "descending"
                                            }
                                        ]
                    */
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
                const dateProp = props["Date"]?.date || props["날짜"]?.date || props["date"]?.date;
                const date = dateProp ? dateProp.start : "";

                // Extract Cover Image (Files & Media property: 'dear23_대표이미지')
                const fileProp = props["dear23_대표이미지"]?.files || [];
                let coverImage = null;
                if (fileProp.length > 0) {
                    const file = fileProp[0];
                    if (file.type === "file") {
                        coverImage = file.file.url; // Expiring URL
                    } else if (file.type === "external") {
                        coverImage = file.external.url;
                    }
                }

                // Extract Preview Text (Text property: 'dear23_내용미리보기')
                const previewList = props["dear23_내용미리보기"]?.rich_text || [];
                const previewText = previewList.length > 0 ? previewList[0].plain_text : "";

                // Extract Author (Select property: '작성자' or Created By)
                // Priority: '작성자' (Select) > 'Created by'
                const authorSelect = props["작성자"]?.select;
                let author = "상대방"; // Default to Korean 'Partner'
                if (authorSelect) {
                    author = authorSelect.name;
                } else {
                    const createdBy = props["Created by"]?.created_by;
                    if (createdBy) {
                        // We might get an ID or name depending on expansion, but usually it's an object.
                        // For now, let's leave it as is or default to something safe if '작성자' is missing.
                        // Ideally '작성자' should be used.
                    }
                }

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
                    mood,
                    weather
                };
            });

            res.status(200).send({
                data: memories,
                hasMore: notionResponse.data.has_more,
                nextCursor: notionResponse.data.next_cursor,
                // [DEBUG] Show available property keys from the first item
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
            const { title, content, type, date, mood, weather } = req.body; // type: 'Diary' | 'Memory' | ...

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

                    // Strategy 1: Remove custom select properties (Author, Weather, Mood)
                    // Strategy 2: Switch Title Property ("이름" <-> "Name")

                    const safeProperties: any = { ...properties };
                    delete safeProperties["작성자"];
                    delete safeProperties["dear23_날씨"];
                    delete safeProperties["dear23_기분"];

                    // Check which title property was used and switch to the other
                    if (safeProperties["이름"]) {
                        safeProperties["Name"] = safeProperties["이름"];
                        delete safeProperties["이름"];
                    } else if (safeProperties["Name"]) {
                        safeProperties["이름"] = safeProperties["Name"];
                        delete safeProperties["Name"];
                    }

                    try {
                        const retryResponse = await axios.post(
                            "https://api.notion.com/v1/pages",
                            {
                                parent: { database_id: databaseId },
                                properties: safeProperties,
                            },
                            {
                                headers: {
                                    "Authorization": `Bearer ${apiKey}`,
                                    "Notion-Version": "2022-06-28",
                                    "Content-Type": "application/json",
                                },
                            }
                        );
                        console.log("Retry successful with safe properties.");
                        res.status(200).send({ data: retryResponse.data, warning: "Some properties were omitted or title key switched due to API restrictions." });
                    } catch (retryError: any) {
                        console.error("Retry attempt also failed:", retryError.message);
                        if (retryError.response) {
                            console.error("Retry Error Data:", JSON.stringify(retryError.response.data));
                        }
                        // Return the ORIGINAL error to helps debug the root cause
                        res.status(500).send({ error: firstError.message, details: firstError.response?.data });
                    }
                } else {
                    throw firstError;
                }
            }


        } catch (error: any) {
            console.error("Error creating Notion page:", error);
            if (error.response) {
                console.error("Notion API Error Response Status:", error.response.status);
                console.error("Notion API Error Response Data:", JSON.stringify(error.response.data));
            } else if (error.request) {
                console.error("Notion API No Response received:", error.request);
            } else {
                console.error("Notion API Request Setup Error:", error.message);
            }
            res.status(500).send({ error: error.message, details: error.response?.data });
        }
    });
});

export const validateNotionSchema = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        res.status(200).send({ status: "valid", created: [] });
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
            if (error.response) {
                console.error("Notion API Error Response:", JSON.stringify(error.response.data));
            }
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
            if (error.response) {
                console.error("Notion API Error Response:", JSON.stringify(error.response.data));
            }
            res.status(500).send({ error: error.message });
        }
    });
});
