"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.smartSearch = exports.aiChat = exports.getTrending = exports.getRecommendations = void 0;
const ai_service_1 = require("../../services/ai.service");
const getRecommendations = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { type, genre, limit } = req.query;
        if (!userId) {
            const trending = await (0, ai_service_1.getTrendingBooks)(type || "all", Number(limit) || 10);
            return res.status(200).json({ success: true, data: trending, source: "trending" });
        }
        const recommendations = await (0, ai_service_1.getSmartRecommendations)({
            userId,
            type: type || "all",
            genre: genre,
            limit: Number(limit) || 10,
        });
        return res.status(200).json({ success: true, data: recommendations, source: "personalized" });
    }
    catch (error) {
        next(error);
    }
};
exports.getRecommendations = getRecommendations;
const getTrending = async (req, res, next) => {
    try {
        const { type, limit } = req.query;
        const books = await (0, ai_service_1.getTrendingBooks)(type || "all", Number(limit) || 10);
        return res.status(200).json({ success: true, data: books });
    }
    catch (error) {
        next(error);
    }
};
exports.getTrending = getTrending;
const aiChat = async (req, res, next) => {
    try {
        const { message, history = [] } = req.body;
        const userId = req.user?.id;
        if (!message || message.trim().length === 0) {
            return res.status(400).json({ success: false, message: "Message is required." });
        }
        const reply = await (0, ai_service_1.chatWithBookSansarAI)(message, history, userId);
        return res.status(200).json({ success: true, data: { reply } });
    }
    catch (error) {
        next(error);
    }
};
exports.aiChat = aiChat;
const smartSearch = async (req, res, next) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ success: false, message: "Search query is required." });
        }
        const results = await (0, ai_service_1.aiSearch)(query);
        return res.status(200).json({ success: true, data: results });
    }
    catch (error) {
        next(error);
    }
};
exports.smartSearch = smartSearch;
