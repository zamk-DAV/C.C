"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotionDatabase = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios_1 = require("axios");
const cors = require("cors");
admin.initializeApp();
const corsHandler = cors({ origin: true });
exports.getNotionDatabase = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        var _a;
        // 1. Verify Authentication
        const tokenId = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split("Bearer ")[1];
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
            const notionResponse = await axios_1.default.post(`https://api.notion.com/v1/databases/${databaseId}/query`, {
                page_size: 20,
                sorts: [
                    {
                        property: "date",
                        direction: "descending"
                    }
                ]
            }, {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Notion-Version": "2022-06-28",
                    "Content-Type": "application/json",
                },
            });
            // 4. Transform Data
            const results = notionResponse.data.results;
            const memories = results.map((page) => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
                const props = page.properties;
                // Extract Title
                const titleList = ((_a = props["Name"]) === null || _a === void 0 ? void 0 : _a.title) || ((_b = props["이름"]) === null || _b === void 0 ? void 0 : _b.title) || ((_c = props["title"]) === null || _c === void 0 ? void 0 : _c.title) || [];
                const title = titleList.length > 0 ? titleList[0].plain_text : "Untitled";
                // Extract Date
                const dateProp = ((_d = props["Date"]) === null || _d === void 0 ? void 0 : _d.date) || ((_e = props["날짜"]) === null || _e === void 0 ? void 0 : _e.date) || ((_f = props["date"]) === null || _f === void 0 ? void 0 : _f.date);
                const date = dateProp ? dateProp.start : "";
                // Extract Cover Image (Files & Media property: 'dear23_대표이미지')
                const fileProp = ((_g = props["dear23_대표이미지"]) === null || _g === void 0 ? void 0 : _g.files) || [];
                let coverImage = null;
                if (fileProp.length > 0) {
                    const file = fileProp[0];
                    if (file.type === "file") {
                        coverImage = file.file.url; // Expiring URL
                    }
                    else if (file.type === "external") {
                        coverImage = file.external.url;
                    }
                }
                // Extract Preview Text (Text property: 'dear23_내용미리보기')
                const previewList = ((_h = props["dear23_내용미리보기"]) === null || _h === void 0 ? void 0 : _h.rich_text) || [];
                const previewText = previewList.length > 0 ? previewList[0].plain_text : "";
                // Extract Author (Select property: '작성자' or Created By)
                // Priority: '작성자' (Select) > 'Created by'
                const authorSelect = (_j = props["작성자"]) === null || _j === void 0 ? void 0 : _j.select;
                let author = "Partner"; // Default
                if (authorSelect) {
                    author = authorSelect.name;
                }
                else {
                    const createdBy = (_k = props["Created by"]) === null || _k === void 0 ? void 0 : _k.created_by;
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
        }
        catch (error) {
            console.error("Error fetching Notion data:", error);
            res.status(500).send({ error: error.message });
        }
    });
});
//# sourceMappingURL=index.js.map