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
            const { startCursor } = req.body;
            const notionResponse = await axios.post(
                `https://api.notion.com/v1/databases/${databaseId}/query`,
                {
                    page_size: 20, // Default to 20
                    start_cursor: (typeof startCursor === 'string' && startCursor.length > 0) ? startCursor : undefined,
                    sorts: [
                        {
                            property: "date", // Assuming 'date' property exists
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
                const authorSelect = props["작성자"]?.select;
                let author = "Partner"; // Default
                if (authorSelect) {
                    author = authorSelect.name;
                } else {
                    // Default fallback logic if needed, or just leave as "Partner"
                }

                return {
                    id: page.id,
                    title,
                    date,
                    coverImage,
                    previewText,
                    author
                };
            });

            res.status(200).send({
                data: memories,
                hasMore: notionResponse.data.has_more,
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
