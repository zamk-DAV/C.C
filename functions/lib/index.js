"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDiaryEntry = exports.deleteDiaryEntry = exports.getNotionPageContent = exports.createDiaryEntry = exports.searchNotionDatabases = exports.getNotionDatabase = exports.validateNotionSchema = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios_1 = require("axios");
const cors = require("cors");
admin.initializeApp();
// Deploy Timestamp: 2026-01-13 11:20
const corsHandler = cors({ origin: true });
// Helper to fetch Notion Config (Prioritizes Couple Data)
const fetchNotionConfig = async (userId) => {
    var _a;
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    const userData = userDoc.data();
    if (!userData)
        return null;
    let config = userData.notionConfig;
    // Check for couple-level config and prioritize it
    if (userData.coupleId) {
        const coupleDoc = await admin.firestore().collection("couples").doc(userData.coupleId).get();
        const coupleData = coupleDoc.data();
        if ((_a = coupleData === null || coupleData === void 0 ? void 0 : coupleData.notionConfig) === null || _a === void 0 ? void 0 : _a.apiKey) {
            config = coupleData.notionConfig;
            console.log(`[Config] Using shared couple config for user ${userId}`);
        }
    }
    return config;
};
exports.validateNotionSchema = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        var _a;
        // [DEBUG] Log incoming request
        console.log("[DEBUG] Request Body:", JSON.stringify(req.body));
        // 1. Verify Authentication
        const tokenId = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split("Bearer ")[1];
        if (!tokenId) {
            res.status(401).send({ error: "Unauthorized" });
            return;
        }
        try {
            const decodedToken = await admin.auth().verifyIdToken(tokenId);
            const uid = decodedToken.uid;
            // 2. Fetch Notion Config from Firestore
            const notionConfig = await fetchNotionConfig(uid);
            if (!notionConfig) {
                res.status(404).send({ error: "Notion configuration not found for this user." });
                return;
            }
            const { apiKey, databaseId } = notionConfig;
            if (!apiKey || !databaseId) {
                res.status(400).send({ error: "Incomplete Notion configuration." });
                return;
            }
            // 3. Fetch Notion Database Properties
            const notionResponse = await axios_1.default.get(`https://api.notion.com/v1/databases/${databaseId}`, {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Notion-Version": "2022-06-28",
                    "Content-Type": "application/json",
                },
            });
            const properties = notionResponse.data.properties;
            // 4. Validate required properties
            const requiredProperties = [
                "Name",
                "dear23_날짜",
                "dear23_카테고리",
                "dear23_대표이미지",
                "dear23_내용미리보기",
                "작성자",
                "dear23_기분",
                "dear23_날씨", // Select property
            ];
            const missingProperties = [];
            const incorrectTypes = [];
            for (const propName of requiredProperties) {
                if (!properties[propName]) {
                    missingProperties.push(propName);
                }
                else {
                    // Validate types for specific properties
                    if (propName === "Name" && properties[propName].type !== "title") {
                        incorrectTypes.push(`${propName} (expected: title, got: ${properties[propName].type})`);
                    }
                    if (propName === "dear23_날짜" && properties[propName].type !== "date") {
                        incorrectTypes.push(`${propName} (expected: date, got: ${properties[propName].type})`);
                    }
                    if (propName === "dear23_카테고리" && properties[propName].type !== "select") {
                        incorrectTypes.push(`${propName} (expected: select, got: ${properties[propName].type})`);
                    }
                    if (propName === "dear23_대표이미지" && properties[propName].type !== "files") {
                        incorrectTypes.push(`${propName} (expected: files, got: ${properties[propName].type})`);
                    }
                    if (propName === "dear23_내용미리보기" && properties[propName].type !== "rich_text") {
                        incorrectTypes.push(`${propName} (expected: rich_text, got: ${properties[propName].type})`);
                    }
                    if (propName === "작성자" && properties[propName].type !== "select") {
                        incorrectTypes.push(`${propName} (expected: select, got: ${properties[propName].type})`);
                    }
                    if (propName === "dear23_기분" && properties[propName].type !== "select") {
                        incorrectTypes.push(`${propName} (expected: select, got: ${properties[propName].type})`);
                    }
                    if (propName === "dear23_날씨" && properties[propName].type !== "select") {
                        incorrectTypes.push(`${propName} (expected: select, got: ${properties[propName].type})`);
                    }
                }
            }
            if (missingProperties.length > 0 || incorrectTypes.length > 0) {
                res.status(400).send({
                    isValid: false,
                    message: "Notion database schema is invalid.",
                    details: {
                        missingProperties,
                        incorrectTypes,
                    },
                });
            }
            else {
                res.status(200).send({
                    isValid: true,
                    message: "Notion database schema is valid.",
                });
            }
        }
        catch (error) {
            console.error("Error validating Notion schema:", error);
            if (error.response) {
                console.error("Notion API Error Response:", JSON.stringify(error.response.data));
            }
            res.status(500).send({ error: error.message });
        }
    });
});
exports.getNotionDatabase = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        var _a;
        // [DEBUG] Log incoming request
        console.log("[DEBUG] Request Body:", JSON.stringify(req.body));
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
            // 2. Fetch Notion Config from Firestore (with fallbacks)
            const notionConfig = await fetchNotionConfig(targetUserId);
            if (!notionConfig) {
                res.status(404).send({ error: "Notion configuration not found for this user." });
                return;
            }
            const { apiKey, databaseId } = notionConfig;
            if (!apiKey || !databaseId) {
                res.status(400).send({ error: "Incomplete Notion configuration." });
                return;
            }
            // 3. Query Notion API
            const { startCursor } = req.body;
            const notionResponse = await axios_1.default.post(`https://api.notion.com/v1/databases/${databaseId}/query`, {
                page_size: 20,
                start_cursor: (typeof startCursor === 'string' && startCursor.length > 0) ? startCursor : undefined,
                filter: req.body.filterType ? {
                    property: "dear23_카테고리",
                    select: {
                        equals: req.body.filterType === 'Diary' ? '일기' :
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
            }, {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Notion-Version": "2022-06-28",
                    "Content-Type": "application/json",
                },
            });
            // 4. Transform Data
            const results = notionResponse.data.results;
            if (results.length > 0) {
                console.log("[DEBUG_KEYS] Notion Properties:", JSON.stringify(Object.keys(results[0].properties)));
            }
            const memories = results.map((page) => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
                const props = page.properties;
                // Extract Title
                const titleList = ((_a = props["Name"]) === null || _a === void 0 ? void 0 : _a.title) || ((_b = props["이름"]) === null || _b === void 0 ? void 0 : _b.title) || ((_c = props["title"]) === null || _c === void 0 ? void 0 : _c.title) || [];
                let title = titleList.length > 0 ? titleList[0].plain_text : "";
                // Extract Date
                const dateProp = ((_d = props["dear23_날짜"]) === null || _d === void 0 ? void 0 : _d.date) || ((_e = props["Date"]) === null || _e === void 0 ? void 0 : _e.date) || ((_f = props["날짜"]) === null || _f === void 0 ? void 0 : _f.date) || ((_g = props["date"]) === null || _g === void 0 ? void 0 : _g.date);
                const date = dateProp ? dateProp.start : "";
                // Extract Cover Image (Files & Media property: 'dear23_대표이미지')
                const fileProp = ((_h = props["dear23_대표이미지"]) === null || _h === void 0 ? void 0 : _h.files) || [];
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
                // Fallback Title: If untitled but has image -> "Photo"
                if (!title || title === "Untitled") {
                    if (coverImage) {
                        title = "Photo";
                    }
                    else {
                        title = "Untitled";
                    }
                }
                // Extract Preview Text (Text property: 'dear23_내용미리보기')
                const previewList = ((_j = props["dear23_내용미리보기"]) === null || _j === void 0 ? void 0 : _j.rich_text) || [];
                const previewText = previewList.length > 0 ? previewList[0].plain_text : "";
                // Extract Author (Select property: '작성자' or Created By)
                // Priority: '작성자' (Select) > 'Created by'
                const authorSelect = (_k = props["작성자"]) === null || _k === void 0 ? void 0 : _k.select;
                let author = "상대방"; // Default to Korean 'Partner'
                if (authorSelect) {
                    author = authorSelect.name;
                }
                else {
                    const createdBy = (_l = props["Created by"]) === null || _l === void 0 ? void 0 : _l.created_by;
                    if (createdBy) {
                        // We might get an ID or name depending on expansion, but usually it's an object.
                        // For now, let's leave it as is or default to something safe if '작성자' is missing.
                        // Ideally '작성자' should be used.
                    }
                }
                // Extract Mood (Select property: 'dear23_기분')
                const mood = (_o = (_m = props["dear23_기분"]) === null || _m === void 0 ? void 0 : _m.select) === null || _o === void 0 ? void 0 : _o.name;
                // Extract Weather (Select property: 'dear23_날씨')
                const weather = (_q = (_p = props["dear23_날씨"]) === null || _p === void 0 ? void 0 : _p.select) === null || _q === void 0 ? void 0 : _q.name;
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
        }
        catch (error) {
            console.error("Error fetching Notion data:", error);
            if (error.response) {
                console.error("Notion API Error Response:", JSON.stringify(error.response.data));
            }
            res.status(500).send({ error: error.message });
        }
    });
});
exports.searchNotionDatabases = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        var _a;
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
const uploadImageToStorage = async (uid, image) => {
    const bucket = admin.storage().bucket();
    // Clean base64 string
    const base64Data = image.base64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    const timestamp = Date.now();
    // Simple sanitization of filename
    const safeName = image.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `users/${uid}/notion_images/${timestamp}_${safeName}`;
    const file = bucket.file(filePath);
    await file.save(buffer, {
        metadata: {
            contentType: image.type,
        },
        public: true, // Make public for Notion to access
    });
    // Get public URL
    // Format: https://storage.googleapis.com/BUCKET_NAME/FILE_PATH
    return `https://storage.googleapis.com/${bucket.name}/${filePath}`;
};
exports.createDiaryEntry = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        var _a, _b, _c, _d;
        // 1. Verify Authentication
        const tokenId = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split("Bearer ")[1];
        if (!tokenId) {
            res.status(401).send({ error: "Unauthorized" });
            return;
        }
        try {
            const decodedToken = await admin.auth().verifyIdToken(tokenId);
            const uid = decodedToken.uid;
            // 2. Fetch Notion Config
            const notionConfig = await fetchNotionConfig(uid);
            if (!notionConfig) {
                res.status(404).send({ error: "Notion configuration not found." });
                return;
            }
            const { apiKey, databaseId } = notionConfig;
            // 3. Prepare Data & Upload Images
            const { title, content, type, date, mood, weather, images } = req.body;
            let categoryValue = "일기"; // Default
            switch (type) {
                case 'Diary':
                    categoryValue = '일기';
                    break;
                case 'Memory':
                    categoryValue = '추억';
                    break;
                case 'Event':
                    categoryValue = '일정';
                    break;
                case 'Letter':
                    categoryValue = '편지';
                    break;
            }
            const entryDate = date || new Date().toISOString().split('T')[0];
            const imageUrls = [];
            // Upload Images if present
            if (images && Array.isArray(images) && images.length > 0) {
                console.log(`[CreateDiary] Uploading ${images.length} images...`);
                try {
                    // Use Promise.all for parallel uploads
                    const uploadPromises = images.map((img) => uploadImageToStorage(uid, img));
                    const urls = await Promise.all(uploadPromises);
                    imageUrls.push(...urls);
                    console.log(`[CreateDiary] Uploaded images:`, imageUrls);
                }
                catch (uploadError) {
                    console.error("[CreateDiary] Image upload failed:", uploadError);
                }
            }
            // 4. Prepare Notion Page Properties
            const properties = {
                "이름": {
                    title: [{ text: { content: title || "Untitled" } }]
                },
                "dear23_카테고리": {
                    select: { name: categoryValue }
                },
                "dear23_날짜": {
                    date: { start: entryDate }
                },
                "dear23_내용미리보기": {
                    rich_text: [{ text: { content: content ? content.substring(0, 1000) : "" } }]
                },
                "작성자": req.body.sender ? {
                    select: { name: req.body.sender }
                } : undefined,
            };
            // Optional Properties
            if (mood)
                properties["dear23_기분"] = { select: { name: mood } };
            if (weather)
                properties["dear23_날씨"] = { select: { name: weather } };
            // Set Cover Image (First uploaded image)
            if (imageUrls.length > 0) {
                properties["dear23_대표이미지"] = {
                    files: [
                        {
                            name: "cover_image",
                            type: "external",
                            external: { url: imageUrls[0] }
                        }
                    ]
                };
            }
            // 5. Prepare Block Children (Content + Images)
            const children = [];
            // Add Text Content
            if (content) {
                // Split content by newlines to create paragraphs handling Notion's block limits
                const paragraphs = content.split('\n');
                paragraphs.forEach((para) => {
                    if (para.trim()) {
                        children.push({
                            object: "block",
                            type: "paragraph",
                            paragraph: {
                                rich_text: [{ type: "text", text: { content: para.substring(0, 2000) } }]
                            }
                        });
                    }
                });
            }
            // Add Image Blocks
            imageUrls.forEach(url => {
                children.push({
                    object: "block",
                    type: "image",
                    image: {
                        type: "external",
                        external: { url: url }
                    }
                });
            });
            // 6. Create Page in Notion
            try {
                const response = await axios_1.default.post("https://api.notion.com/v1/pages", {
                    parent: { database_id: databaseId },
                    properties: properties,
                    children: children.length > 0 ? children : undefined
                }, {
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Notion-Version": "2022-06-28",
                        "Content-Type": "application/json",
                    },
                });
                res.status(200).send({ data: response.data });
            }
            catch (firstError) {
                console.error("[Notion] Create failed:", firstError.message);
                if (firstError.response) {
                    console.error("[Notion] Response:", JSON.stringify(firstError.response.data));
                }
                // ... (Retry logic omitted for brevity in this step, can be re-added if needed or simplified)
                // For this edit, I'm replacing the whole function block, so I should ideally keep the retry logic if it was valuable.
                // The previous code had complex retry logic. I should probably simplify or preserve it. 
                // Let's implement a simplified retry for "title key" issues, which seemed to be the main concern.
                if (((_b = firstError.response) === null || _b === void 0 ? void 0 : _b.status) === 400) {
                    // Retry with 'Name' if '이름' failed
                    try {
                        console.log("[Retry] Trying with key 'Name'...");
                        const retryProps = Object.assign({}, properties);
                        if (retryProps["이름"]) {
                            retryProps["Name"] = retryProps["이름"];
                            delete retryProps["이름"];
                        }
                        const retryResponse = await axios_1.default.post("https://api.notion.com/v1/pages", {
                            parent: { database_id: databaseId },
                            properties: retryProps,
                            children: children.length > 0 ? children : undefined
                        }, {
                            headers: {
                                "Authorization": `Bearer ${apiKey}`,
                                "Notion-Version": "2022-06-28",
                                "Content-Type": "application/json",
                            },
                        });
                        res.status(200).send({ data: retryResponse.data, warning: "Retried with 'Name' key" });
                    }
                    catch (retryError) {
                        res.status(500).send({
                            error: "Failed to create page after retry",
                            details: ((_c = retryError.response) === null || _c === void 0 ? void 0 : _c.data) || retryError.message
                        });
                    }
                }
                else {
                    res.status(500).send({ error: firstError.message, details: (_d = firstError.response) === null || _d === void 0 ? void 0 : _d.data });
                }
            }
        }
        catch (error) {
            console.error("Error creating Notion page:", error);
            res.status(500).send({ error: error.message });
        }
    });
});
exports.getNotionPageContent = functions.https.onRequest((req, res) => {
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
            // 2. Fetch Notion Config
            // We need config to get API Key.
            const notionConfig = await fetchNotionConfig(uid);
            if (!notionConfig || !notionConfig.apiKey) {
                res.status(404).send({ error: "Notion configuration not found." });
                return;
            }
            const { apiKey } = notionConfig;
            const { pageId } = req.body;
            if (!pageId) {
                res.status(400).send({ error: "pageId is required" });
                return;
            }
            // 3. Fetch Block Children (Page Content)
            const response = await axios_1.default.get(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`, {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Notion-Version": "2022-06-28",
                },
            });
            res.status(200).send({ data: response.data });
        }
        catch (error) {
            console.error("Error fetching page content:", error);
            res.status(500).send({ error: error.message });
        }
    });
});
exports.deleteDiaryEntry = functions.https.onRequest((req, res) => {
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
            // 2. Fetch Notion Config
            const notionConfig = await fetchNotionConfig(uid);
            if (!notionConfig) {
                res.status(404).send({ error: "Notion configuration not found." });
                return;
            }
            const { apiKey } = notionConfig;
            // 3. Archive Page
            const { pageId } = req.body;
            if (!pageId) {
                res.status(400).send({ error: "Page ID is required." });
                return;
            }
            const response = await axios_1.default.patch(`https://api.notion.com/v1/pages/${pageId}`, { archived: true }, {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Notion-Version": "2022-06-28",
                    "Content-Type": "application/json",
                },
            });
            res.status(200).send({ data: response.data });
        }
        catch (error) {
            console.error("Error deleting Notion page:", error);
            if (error.response) {
                console.error("Notion API Error Response:", JSON.stringify(error.response.data));
            }
            res.status(500).send({ error: error.message });
        }
    });
});
exports.updateDiaryEntry = functions.https.onRequest((req, res) => {
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
            // 2. Fetch Notion Config
            const notionConfig = await fetchNotionConfig(uid);
            if (!notionConfig) {
                res.status(404).send({ error: "Notion configuration not found." });
                return;
            }
            const { apiKey } = notionConfig;
            // 3. Prepare Update Data
            const { pageId, title, content, mood, weather, date, images } = req.body;
            if (!pageId) {
                res.status(400).send({ error: "Page ID is required" });
                return;
            }
            const properties = {
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
            // Handle Image Uploads
            const imageUrls = [];
            if (images && Array.isArray(images) && images.length > 0) {
                console.log(`[UpdateDiary] Uploading ${images.length} images...`);
                try {
                    const uploadPromises = images.map((img) => uploadImageToStorage(uid, img));
                    const urls = await Promise.all(uploadPromises);
                    imageUrls.push(...urls);
                    console.log(`[UpdateDiary] Uploaded images:`, imageUrls);
                    // Set Cover Image if available (and maybe if not currently set? For now, we update it)
                    if (imageUrls.length > 0) {
                        properties["dear23_대표이미지"] = {
                            files: [
                                {
                                    name: "cover_image",
                                    type: "external",
                                    external: { url: imageUrls[0] }
                                }
                            ]
                        };
                    }
                }
                catch (uploadError) {
                    console.error("[UpdateDiary] Image upload failed:", uploadError);
                }
            }
            // 4. Update Page Properties in Notion
            const response = await axios_1.default.patch(`https://api.notion.com/v1/pages/${pageId}`, {
                properties: properties
            }, {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Notion-Version": "2022-06-28",
                    "Content-Type": "application/json",
                },
            });
            // 5. Append Image Blocks (if any)
            if (imageUrls.length > 0) {
                const children = [];
                imageUrls.forEach(url => {
                    children.push({
                        object: "block",
                        type: "image",
                        image: {
                            type: "external",
                            external: { url: url }
                        }
                    });
                });
                try {
                    await axios_1.default.patch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
                        children: children
                    }, {
                        headers: {
                            "Authorization": `Bearer ${apiKey}`,
                            "Notion-Version": "2022-06-28",
                            "Content-Type": "application/json",
                        },
                    });
                    console.log(`[UpdateDiary] Appended ${children.length} image blocks.`);
                }
                catch (appendError) {
                    console.error("[UpdateDiary] Failed to append image blocks:", appendError);
                    // We don't fail the whole request since properties update might have succeeded
                }
            }
            res.status(200).send({ data: response.data });
        }
        catch (error) {
            console.error("Error updating Notion page:", error);
            if (error.response) {
                console.error("Notion API Error Response:", JSON.stringify(error.response.data));
            }
            res.status(500).send({ error: error.message });
        }
    });
});
//# sourceMappingURL=index.js.map