"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDiaryEntry = exports.deleteDiaryEntry = exports.validateNotionSchema = exports.createDiaryEntry = exports.searchNotionDatabases = exports.getNotionDatabase = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios_1 = require("axios");
const cors = require("cors");
admin.initializeApp();
// Deploy Timestamp: 2026-01-13 11:20
const corsHandler = cors({ origin: true });
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
            const notionResponse = await axios_1.default.post(`https://api.notion.com/v1/databases/${databaseId}/query`, {
                page_size: 20,
                start_cursor: (typeof startCursor === 'string' && startCursor.length > 0) ? startCursor : undefined,
                /*
                                    sorts: [
                                        {
                                            property: "date", // Assuming 'date' property exists
                                            direction: "descending"
                                        }
                                    ]
                */
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
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
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
                let author = "상대방"; // Default to Korean 'Partner'
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
                // Extract Mood (Select property: 'dear23_기분')
                const mood = (_m = (_l = props["dear23_기분"]) === null || _l === void 0 ? void 0 : _l.select) === null || _m === void 0 ? void 0 : _m.name;
                // Extract Weather (Select property: 'dear23_날씨')
                const weather = (_p = (_o = props["dear23_날씨"]) === null || _o === void 0 ? void 0 : _o.select) === null || _p === void 0 ? void 0 : _p.name;
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
exports.createDiaryEntry = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        var _a, _b, _c, _d, _e, _f;
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
                const response = await axios_1.default.post("https://api.notion.com/v1/pages", {
                    parent: { database_id: databaseId },
                    properties: properties,
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
                console.error("First attempt failed:", firstError.message);
                if (((_b = firstError.response) === null || _b === void 0 ? void 0 : _b.status) === 400) {
                    console.warn("Retrying with alternative strategies...");
                    const errorDetail = JSON.stringify((_c = firstError.response) === null || _c === void 0 ? void 0 : _c.data);
                    console.warn("Error Detail:", errorDetail);
                    // Strategy: Try alternative title keys if 'Name is not a property' or similar error
                    const possibleTitleKeys = ["Name", "title", "제목", "Title"];
                    const currentTitleKey = "이름";
                    let lastError = firstError;
                    for (const altKey of possibleTitleKeys) {
                        try {
                            console.log(`[Retry] Trying with title key: ${altKey}`);
                            const retryProps = Object.assign({}, properties);
                            delete retryProps[currentTitleKey]; // Remove the one that likely failed
                            retryProps[altKey] = properties["이름"]; // Copy value
                            // Also optionally remove potentially problematic select props in second retry if still failing
                            // But let's try just the key first
                            const retryResponse = await axios_1.default.post("https://api.notion.com/v1/pages", {
                                parent: { database_id: databaseId },
                                properties: retryProps,
                            }, {
                                headers: {
                                    "Authorization": `Bearer ${apiKey}`,
                                    "Notion-Version": "2022-06-28",
                                    "Content-Type": "application/json",
                                },
                            });
                            console.log(`[Retry] Success with key: ${altKey}`);
                            res.status(200).send({ data: retryResponse.data, warning: `Title key switched to ${altKey}` });
                            return;
                        }
                        catch (retryError) {
                            console.warn(`[Retry] Failed with key: ${altKey}`, retryError.message);
                            lastError = retryError;
                        }
                    }
                    // Final Strategy: Remove all custom props and try the first property that failed (likely '이름' or 'Name')
                    // to at least save the core properties
                    console.warn("Final Attempt: Stripping everything except core Notion fields...");
                    try {
                        const minimalProps = Object.assign({}, properties);
                        delete minimalProps["작성자"];
                        delete minimalProps["dear23_날씨"];
                        delete minimalProps["dear23_기분"];
                        const finalResponse = await axios_1.default.post("https://api.notion.com/v1/pages", {
                            parent: { database_id: databaseId },
                            properties: minimalProps,
                        }, {
                            headers: {
                                "Authorization": `Bearer ${apiKey}`,
                                "Notion-Version": "2022-06-28",
                                "Content-Type": "application/json",
                            },
                        });
                        res.status(200).send({ data: finalResponse.data, warning: "Saved with minimal properties." });
                    }
                    catch (finalError) {
                        res.status(500).send({
                            error: "Failed after all retries",
                            firstError: firstError.message,
                            finalError: finalError.message,
                            details: (_d = finalError.response) === null || _d === void 0 ? void 0 : _d.data
                        });
                    }
                }
                else {
                    res.status(500).send({ error: firstError.message, details: (_e = firstError.response) === null || _e === void 0 ? void 0 : _e.data });
                }
            }
        }
        catch (error) {
            console.error("Error creating Notion page:", error);
            if (error.response) {
                console.error("Notion API Error Response Status:", error.response.status);
                console.error("Notion API Error Response Data:", JSON.stringify(error.response.data));
            }
            else if (error.request) {
                console.error("Notion API No Response received:", error.request);
            }
            else {
                console.error("Notion API Request Setup Error:", error.message);
            }
            res.status(500).send({ error: error.message, details: (_f = error.response) === null || _f === void 0 ? void 0 : _f.data });
        }
    });
});
exports.validateNotionSchema = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        res.status(200).send({ status: "valid", created: [] });
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
            // 4. Update Page in Notion
            const response = await axios_1.default.patch(`https://api.notion.com/v1/pages/${pageId}`, {
                properties: properties
            }, {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Notion-Version": "2022-06-28",
                    "Content-Type": "application/json",
                },
            });
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