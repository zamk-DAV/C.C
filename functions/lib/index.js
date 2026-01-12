"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDiaryEntry = exports.validateNotionSchema = exports.searchNotionDatabases = exports.createDiaryEntry = exports.getNotionDatabase = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios_1 = require("axios");
const cors = require("cors");
const FormData = require("form-data");
admin.initializeApp();
const corsHandler = cors({ origin: true });
exports.getNotionDatabase = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        var _a, _b;
        // 1. Verify Authentication
        const tokenId = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split("Bearer ")[1];
        if (!tokenId) {
            res.status(401).send({ error: "Unauthorized" });
            return;
        }
        try {
            const decodedToken = await admin.auth().verifyIdToken(tokenId);
            const uid = decodedToken.uid;
            const targetUserId = req.body.targetUserId || uid;
            // 2. Fetch Notion Config from Firestore (Couple > User Priority)
            const userDoc = await admin.firestore().collection("users").doc(targetUserId).get();
            const userData = userDoc.data();
            let apiKey, databaseId;
            // 1. Try Shared Couple Config First (Priority)
            if (userData === null || userData === void 0 ? void 0 : userData.coupleId) {
                const coupleDoc = await admin.firestore().collection("couples").doc(userData.coupleId).get();
                const coupleData = coupleDoc.data();
                if (coupleData === null || coupleData === void 0 ? void 0 : coupleData.notionConfig) {
                    apiKey = coupleData.notionConfig.apiKey;
                    databaseId = coupleData.notionConfig.databaseId;
                }
            }
            // 2. Fallback to Personal Config
            if ((!apiKey || !databaseId) && (userData === null || userData === void 0 ? void 0 : userData.notionConfig)) {
                apiKey = userData.notionConfig.apiKey;
                databaseId = userData.notionConfig.databaseId;
            }
            if (!apiKey || !databaseId) {
                res.status(400).send({ error: "Incomplete Notion configuration." });
                return;
            }
            // 3. Query Notion API
            const { startCursor, pageSize } = req.body;
            const limit = pageSize && typeof pageSize === 'number' ? pageSize : 20;
            const notionResponse = await axios_1.default.post(`https://api.notion.com/v1/databases/${databaseId}/query`, {
                page_size: limit,
                start_cursor: (typeof startCursor === 'string' && startCursor.length > 0) ? startCursor : undefined,
                sorts: [
                    {
                        property: "날짜",
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
                var _a, _b, _c, _d, _e, _f, _g, _h, _j;
                const props = page.properties;
                // Extract Title
                const titleList = ((_a = props["Name"]) === null || _a === void 0 ? void 0 : _a.title) || ((_b = props["이름"]) === null || _b === void 0 ? void 0 : _b.title) || ((_c = props["title"]) === null || _c === void 0 ? void 0 : _c.title) || [];
                const title = titleList.length > 0 ? titleList[0].plain_text : "Untitled";
                // Extract Date
                const dateProp = ((_d = props["Date"]) === null || _d === void 0 ? void 0 : _d.date) || ((_e = props["날짜"]) === null || _e === void 0 ? void 0 : _e.date) || ((_f = props["date"]) === null || _f === void 0 ? void 0 : _f.date);
                const date = dateProp ? dateProp.start : "";
                // Extract Cover Image (Files & Media property: 'dear23_대표이미지')
                const fileProp = ((_g = props["dear23_대표이미지"]) === null || _g === void 0 ? void 0 : _g.files) || [];
                let images = [];
                if (fileProp.length > 0) {
                    fileProp.forEach((file) => {
                        if (file.type === "file") {
                            images.push(file.file.url);
                        }
                        else if (file.type === "external") {
                            images.push(file.external.url);
                        }
                    });
                }
                const coverImage = images.length > 0 ? images[0] : null;
                // Extract Preview Text (Text property: 'dear23_내용미리보기')
                const previewList = ((_h = props["dear23_내용미리보기"]) === null || _h === void 0 ? void 0 : _h.rich_text) || [];
                const previewText = previewList.length > 0 ? previewList[0].plain_text : "";
                // Extract Author
                const authorSelect = (_j = props["작성자"]) === null || _j === void 0 ? void 0 : _j.select;
                let author = "Partner";
                if (authorSelect) {
                    author = authorSelect.name;
                }
                return {
                    id: page.id,
                    title,
                    date,
                    coverImage,
                    images,
                    previewText,
                    author
                };
            });
            res.status(200).send({
                data: memories,
                hasMore: notionResponse.data.has_more,
                nextCursor: notionResponse.data.next_cursor
            });
        }
        catch (error) {
            console.error("Error fetching Notion data:", error);
            res.status(500).send({
                error: error.message,
                details: ((_b = error.response) === null || _b === void 0 ? void 0 : _b.data) || "No additional details"
            });
        }
    });
});
exports.createDiaryEntry = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        var _a;
        const tokenId = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split("Bearer ")[1];
        if (!tokenId) {
            res.status(401).send({ error: "Unauthorized" });
            return;
        }
        try {
            const decodedToken = await admin.auth().verifyIdToken(tokenId);
            const uid = decodedToken.uid;
            const userDoc = await admin.firestore().collection("users").doc(uid).get();
            const userData = userDoc.data();
            let apiKey, databaseId;
            // 1. Try Shared Couple Config First (Priority)
            if (userData === null || userData === void 0 ? void 0 : userData.coupleId) {
                const coupleDoc = await admin.firestore().collection("couples").doc(userData.coupleId).get();
                const coupleData = coupleDoc.data();
                if (coupleData === null || coupleData === void 0 ? void 0 : coupleData.notionConfig) {
                    apiKey = coupleData.notionConfig.apiKey;
                    databaseId = coupleData.notionConfig.databaseId;
                    console.log(`[Config] Using Shared Couple Config for ${userData.coupleId}`);
                }
            }
            // 2. Fallback to Personal Config
            if ((!apiKey || !databaseId) && (userData === null || userData === void 0 ? void 0 : userData.notionConfig)) {
                apiKey = userData.notionConfig.apiKey;
                databaseId = userData.notionConfig.databaseId;
                console.log("[Config] Using Personal User Config (Legacy)");
            }
            if (!apiKey || !databaseId) {
                res.status(404).send({ error: "Configuration not found. Please check Settings." });
                return;
            }
            // Destructure new properties with defaults
            const { content, images, category = "일기", mood = "평온", sender = "나", date = new Date().toISOString().split('T')[0] } = req.body;
            // 1. Upload Images to Notion (Method: v1/file_uploads/{id}/send)
            const uploadedFiles = [];
            if (images && images.length > 0) {
                console.log(`Processing ${images.length} images via /send endpoint...`);
                for (const img of images) {
                    try {
                        // Robust Base64 Parsing (Fixing Content-Type Mismatch)
                        const matches = img.base64.match(/^data:(.+);base64,(.+)$/);
                        if (!matches) {
                            throw new Error(`Invalid base64 format for image: ${img.name}`);
                        }
                        const realMimeType = matches[1];
                        const realBase64Data = matches[2];
                        const buffer = Buffer.from(realBase64Data, 'base64');
                        console.log(`Preparing upload: ${img.name}, Type: ${realMimeType}, Size: ${buffer.length} bytes`);
                        // 1. Init Upload
                        const initRes = await axios_1.default.post("https://api.notion.com/v1/file_uploads", {
                            content_type: realMimeType,
                            content_length: buffer.length
                        }, {
                            headers: {
                                "Authorization": `Bearer ${apiKey}`,
                                "Notion-Version": "2022-06-28",
                                "Content-Type": "application/json"
                            }
                        });
                        // Fix: Response IS the file_upload object, not { file_upload: ... }
                        const fileData = initRes.data;
                        console.log("File Init Response:", JSON.stringify(fileData));
                        if (!fileData || !fileData.id) {
                            throw new Error("Failed to get file_upload ID from Notion response");
                        }
                        const fileId = fileData.id;
                        console.log(`Initialized file ID: ${fileId}`);
                        // 2. Send Content (POST .../send)
                        const form = new FormData();
                        form.append("file", buffer, {
                            filename: img.name || "image.png",
                            contentType: realMimeType
                        });
                        const formHeaders = form.getHeaders();
                        await axios_1.default.post(`https://api.notion.com/v1/file_uploads/${fileId}/send`, form, {
                            headers: Object.assign(Object.assign({}, formHeaders), { "Authorization": `Bearer ${apiKey}`, "Notion-Version": "2022-06-28", "Content-Length": form.getLengthSync() // Explicitly set length
                             })
                        });
                        uploadedFiles.push({
                            url: "",
                            id: fileId,
                            name: img.name
                        });
                        console.log(`Successfully sent file content for ID: ${fileId}`);
                    }
                    catch (e) {
                        console.error("Image upload step failed:", e.message || e);
                        if (e.response) {
                            console.error("Response data:", e.response.data);
                        }
                        throw e;
                    }
                }
            }
            // 2. Create Page (Header & Props ONLY)
            // We do separate steps to avoid 'Invalid URL' errors during page creation
            // if Notion validates block children strictly.
            // 2. Dynamic Title Property Lookup
            // Fetch database schema to find the actual Title property name (it might not be "Name" or "제목")
            console.log("Fetching database schema to find Title property...");
            const dbSchemaRes = await axios_1.default.get(`https://api.notion.com/v1/databases/${databaseId}`, {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Notion-Version": "2022-06-28",
                },
            });
            const dbProperties = dbSchemaRes.data.properties;
            let titlePropertyName = "Name"; // Default fallback
            for (const key in dbProperties) {
                if (dbProperties[key].type === "title") {
                    titlePropertyName = key;
                    break;
                }
            }
            console.log(`Detected Title property name: "${titlePropertyName}"`);
            // 3. Create Page (With Required Properties)
            console.log("Creating page with properties...");
            const pageProperties = {
                [titlePropertyName]: { title: [{ text: { content: content ? content.slice(0, 20) : "Diary" } }] },
                "dear23_날짜": { date: { start: date } },
                "dear23_카테고리": { select: { name: category } },
                "dear23_기분": { select: { name: mood } },
                "dear23_작성자": { select: { name: sender } },
                "dear23_내용미리보기": { rich_text: [{ text: { content: content || "" } }] },
                "dear23_이미지유무": { checkbox: images && images.length > 0 }
            };
            const createPageRes = await axios_1.default.post("https://api.notion.com/v1/pages", {
                parent: { database_id: databaseId },
                properties: pageProperties
            }, {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Notion-Version": "2022-06-28",
                    "Content-Type": "application/json"
                }
            });
            const pageId = createPageRes.data.id;
            console.log(`Page created: ${pageId}`);
            // 3. Append Blocks (Text + Images)
            const childrenBlocks = [];
            // Text Block
            if (content) {
                childrenBlocks.push({
                    object: "block",
                    type: "paragraph",
                    paragraph: {
                        rich_text: [{ type: "text", text: { content: content } }]
                    }
                });
            }
            // Image Blocks (Using INTERNAL ID)
            uploadedFiles.forEach(f => {
                childrenBlocks.push({
                    object: "block",
                    type: "image",
                    image: {
                        type: "file_upload",
                        file_upload: { id: f.id }
                    }
                });
            });
            if (childrenBlocks.length > 0) {
                console.log(`Appending ${childrenBlocks.length} blocks...`);
                await axios_1.default.patch(`https://api.notion.com/v1/blocks/${pageId}/children`, { children: childrenBlocks }, {
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Notion-Version": "2022-06-28",
                        "Content-Type": "application/json"
                    }
                });
            }
            res.status(200).send({ success: true, pageId });
        }
        catch (e) {
            console.error("Error creating diary entry:", e);
            // IMPROVED ERROR HANDLING: Return detailed Notion error
            if (e.response && e.response.data) {
                console.error("Notion API Error Details:", JSON.stringify(e.response.data));
                res.status(e.response.status).send({
                    error: `Notion Error: ${e.response.data.message || e.message}`,
                    details: e.response.data
                });
                return;
            }
            res.status(500).send({ error: e.message || e });
        }
    });
});
exports.searchNotionDatabases = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        var _a;
        // ... (existing search code)
        // Re-copying existing functionality to ensure no loss
        // 1. Verify Authentication
        const tokenId = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split("Bearer ")[1];
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
            const notionResponse = await axios_1.default.post("https://api.notion.com/v1/search", {
                filter: {
                    value: "database",
                    property: "object"
                },
                page_size: 100
            }, {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Notion-Version": "2022-06-28",
                    "Content-Type": "application/json",
                },
            });
            // 4. Return simplified list
            const databases = notionResponse.data.results.map((db) => {
                var _a, _b;
                return ({
                    id: db.id,
                    title: ((_b = (_a = db.title) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.plain_text) || "Untitled Database",
                    url: db.url,
                    icon: db.icon
                });
            });
            res.status(200).send({ data: databases });
        }
        catch (error) {
            console.error("Error searching Notion databases:", error);
            res.status(500).send({ error: error.message });
        }
    });
});
// ... (existing code)
exports.validateNotionSchema = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        var _a, _b, _c;
        // 1. Verify Authentication
        const tokenId = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split("Bearer ")[1];
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
            // 2. Define Required Schema (Aligning with Dear23 Standard)
            const requiredProperties = {
                // Common
                "dear23_날짜": { date: {} },
                "dear23_카테고리": { select: { options: [{ name: "일기", color: "blue" }, { name: "일정", color: "green" }, { name: "편지", color: "pink" }, { name: "추억", color: "yellow" }] } },
                "dear23_작성자": { select: {} },
                "dear23_내용미리보기": { rich_text: {} },
                "dear23_나만보기": { checkbox: {} },
                "dear23_좋아요": { checkbox: {} },
                "dear23_작성일시": { created_time: {} },
                "dear23_수정일시": { last_edited_time: {} },
                // Diary
                "dear23_대표이미지": { files: {} },
                "dear23_이미지유무": { checkbox: {} },
                "dear23_기분": { select: { options: [{ name: "행복", color: "yellow" }, { name: "슬픔", color: "blue" }, { name: "화남", color: "red" }, { name: "보통", color: "gray" }, { name: "평온", color: "default" }] } },
                "dear23_날씨": { select: { options: [{ name: "맑음", color: "orange" }, { name: "흐림", color: "gray" }, { name: "비", color: "blue" }, { name: "눈", color: "default" }] } },
                "dear23_상대방한마디": { rich_text: {} },
                // Calendar
                "dear23_함께하기": { checkbox: {} },
                "dear23_중요": { checkbox: {} },
                "dear23_장소": { rich_text: {} },
                // Letter
                "dear23_읽음": { checkbox: {} },
                "dear23_개봉일": { date: {} },
                // Legacy Fallback (Optional: keep Korean keys if we suspect existing users have them, but new standard is dear23_)
                // Ideally we should migrate, but for now we enforce creation of dear23_ keys.
            };
            // 3. Fetch Current Schema
            const dbResponse = await axios_1.default.get(`https://api.notion.com/v1/databases/${databaseId}`, {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Notion-Version": "2022-06-28",
                },
            });
            const currentProperties = dbResponse.data.properties;
            const propertiesToCreate = {};
            const missingList = [];
            // 4. Check for missing properties
            for (const [name, config] of Object.entries(requiredProperties)) {
                if (!currentProperties[name]) {
                    propertiesToCreate[name] = config;
                    missingList.push(name);
                }
            }
            // 5. Update Database if needed
            if (Object.keys(propertiesToCreate).length > 0) {
                await axios_1.default.patch(`https://api.notion.com/v1/databases/${databaseId}`, { properties: propertiesToCreate }, {
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Notion-Version": "2022-06-28",
                        "Content-Type": "application/json",
                    },
                });
                res.status(200).send({ status: "updated", created: missingList });
            }
            else {
                res.status(200).send({ status: "ok", message: "Schema is already perfect!" });
            }
        }
        catch (error) {
            console.error("Error validating Notion schema:", ((_b = error.response) === null || _b === void 0 ? void 0 : _b.data) || error);
            res.status(500).send({ error: error.message, details: (_c = error.response) === null || _c === void 0 ? void 0 : _c.data });
        }
    });
});
exports.deleteDiaryEntry = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        var _a, _b;
        const tokenId = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split("Bearer ")[1];
        if (!tokenId) {
            res.status(401).send({ error: "Unauthorized" });
            return;
        }
        try {
            const decodedToken = await admin.auth().verifyIdToken(tokenId);
            const uid = decodedToken.uid;
            const { pageId } = req.body;
            if (!pageId) {
                res.status(400).send({ error: "Page ID is required" });
                return;
            }
            // Fetch Config
            const userDoc = await admin.firestore().collection("users").doc(uid).get();
            const userData = userDoc.data();
            let apiKey, databaseId;
            if (userData === null || userData === void 0 ? void 0 : userData.coupleId) {
                const coupleDoc = await admin.firestore().collection("couples").doc(userData.coupleId).get();
                const coupleData = coupleDoc.data();
                if (coupleData === null || coupleData === void 0 ? void 0 : coupleData.notionConfig) {
                    apiKey = coupleData.notionConfig.apiKey;
                    databaseId = coupleData.notionConfig.databaseId;
                }
            }
            if ((!apiKey || !databaseId) && (userData === null || userData === void 0 ? void 0 : userData.notionConfig)) {
                apiKey = userData.notionConfig.apiKey;
                databaseId = userData.notionConfig.databaseId;
            }
            if (!apiKey) {
                res.status(404).send({ error: "Notion API Key not found" });
                return;
            }
            // Call Notion API to Archive (Delete)
            await axios_1.default.patch(`https://api.notion.com/v1/pages/${pageId}`, { archived: true }, {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Notion-Version": "2022-06-28",
                    "Content-Type": "application/json"
                }
            });
            res.status(200).send({ success: true, message: "Entry deleted successfully" });
        }
        catch (error) {
            console.error("Error deleting diary entry:", error);
            res.status(500).send({ error: error.message, details: (_b = error.response) === null || _b === void 0 ? void 0 : _b.data });
        }
    });
});
//# sourceMappingURL=index.js.map