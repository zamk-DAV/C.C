import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";
import * as cors from "cors";

admin.initializeApp();

const corsHandler = cors({ origin: true });

// Interface for Notion Select/MultiSelect options
interface NotionSelect {
    id: string;
    name: string;
    color: string;
}

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
            const notionResponse = await axios.post(
                `https://api.notion.com/v1/databases/${databaseId}/query`,
                {
                    page_size: 20,
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
                // Priority: '작성자' (Select) > 'Created by'
                const authorSelect = props["작성자"]?.select;
                let author = "Partner"; // Default
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

                return {
                    id: page.id,
                    title,
                    date,
                    coverImage,
                    previewText,
                    author
                };
            });

            res.status(200).send({ data: memories });

        } catch (error: any) {
            console.error("Error fetching Notion data:", error);
            res.status(500).send({ error: error.message });
        }
    });
});
