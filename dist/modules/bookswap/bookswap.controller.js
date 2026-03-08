"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllSwapsAdmin = exports.respondToProposal = exports.proposeSwap = exports.deleteSwap = exports.updateSwap = exports.getSingleSwap = exports.getMySwaps = exports.getAllSwaps = exports.createSwap = void 0;
const bookswap_model_1 = __importDefault(require("./bookswap.model"));
const createSwap = async (req, res) => {
    try {
        const ownerId = req.user?.id;
        const { bookTitle, bookAuthor, bookDescription, bookImages, bookCondition, bookCategory, bookLanguage, wantedBookTitle, wantedBookDescription, wantedBookCategory, location, preferLocalSwap, } = req.body;
        if (!bookTitle ||
            !bookAuthor ||
            !bookDescription ||
            !bookCondition ||
            !wantedBookDescription) {
            return res.status(400).json({
                success: false,
                message: "bookTitle, bookAuthor, bookDescription, bookCondition and wantedBookDescription are required",
            });
        }
        if (!bookImages || bookImages.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one image of your book is required",
            });
        }
        const swap = await bookswap_model_1.default.create({
            ownerId,
            bookTitle,
            bookAuthor,
            bookDescription,
            bookImages,
            bookCondition,
            bookCategory,
            bookLanguage,
            wantedBookTitle,
            wantedBookDescription,
            wantedBookCategory,
            location,
            preferLocalSwap: preferLocalSwap ?? false,
        });
        return res.status(201).json({
            success: true,
            message: "Swap listing created successfully",
            data: swap,
        });
    }
    catch (err) {
        return res
            .status(500)
            .json({ success: false, message: "Failed to create swap listing" });
    }
};
exports.createSwap = createSwap;
const getAllSwaps = async (req, res) => {
    try {
        const { search, category, location, condition, page = 1, limit = 12, } = req.query;
        const filter = { status: "open" };
        if (category)
            filter.bookCategory = category;
        if (location)
            filter.location = { $regex: location, $options: "i" };
        if (condition)
            filter.bookCondition = condition;
        if (search) {
            filter.$or = [
                { bookTitle: { $regex: search, $options: "i" } },
                { bookAuthor: { $regex: search, $options: "i" } },
                { wantedBookTitle: { $regex: search, $options: "i" } },
            ];
        }
        const skip = (Number(page) - 1) * Number(limit);
        const [swaps, total] = await Promise.all([
            bookswap_model_1.default.find(filter)
                .populate("ownerId", "name avatar location")
                .select("-proposals")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            bookswap_model_1.default.countDocuments(filter),
        ]);
        return res.json({
            success: true,
            data: swaps,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (err) {
        return res
            .status(500)
            .json({ success: false, message: "Failed to fetch swaps" });
    }
};
exports.getAllSwaps = getAllSwaps;
const getMySwaps = async (req, res) => {
    try {
        const ownerId = req.user?.id;
        const swaps = await bookswap_model_1.default.find({ ownerId })
            .sort({ createdAt: -1 })
            .populate("proposals.proposerId", "name avatar");
        return res.json({ success: true, data: swaps });
    }
    catch (err) {
        return res
            .status(500)
            .json({ success: false, message: "Failed to fetch your swaps" });
    }
};
exports.getMySwaps = getMySwaps;
const getSingleSwap = async (req, res) => {
    try {
        const swap = await bookswap_model_1.default.findById(req.params.id)
            .populate("ownerId", "name avatar location")
            .populate("proposals.proposerId", "name avatar");
        if (!swap) {
            return res
                .status(404)
                .json({ success: false, message: "Swap listing not found" });
        }
        return res.json({ success: true, data: swap });
    }
    catch (err) {
        return res
            .status(500)
            .json({ success: false, message: "Failed to fetch swap" });
    }
};
exports.getSingleSwap = getSingleSwap;
const updateSwap = async (req, res) => {
    try {
        const userId = req.user?.id;
        const swap = await bookswap_model_1.default.findById(req.params.id);
        if (!swap) {
            return res
                .status(404)
                .json({ success: false, message: "Swap listing not found" });
        }
        if (swap.ownerId.toString() !== userId) {
            return res
                .status(403)
                .json({ success: false, message: "Not authorized" });
        }
        if (swap.status !== "open") {
            return res.status(400).json({
                success: false,
                message: "Cannot edit a swap that is not open",
            });
        }
        const allowed = [
            "bookDescription",
            "bookImages",
            "bookCondition",
            "bookCategory",
            "bookLanguage",
            "wantedBookTitle",
            "wantedBookDescription",
            "wantedBookCategory",
            "location",
            "preferLocalSwap",
        ];
        for (const field of allowed) {
            if (req.body[field] !== undefined) {
                swap[field] = req.body[field];
            }
        }
        await swap.save();
        return res.json({ success: true, message: "Swap updated", data: swap });
    }
    catch (err) {
        return res
            .status(500)
            .json({ success: false, message: "Failed to update swap" });
    }
};
exports.updateSwap = updateSwap;
const deleteSwap = async (req, res) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const swap = await bookswap_model_1.default.findById(req.params.id);
        if (!swap) {
            return res
                .status(404)
                .json({ success: false, message: "Swap listing not found" });
        }
        if (swap.ownerId.toString() !== userId && userRole !== "admin") {
            return res
                .status(403)
                .json({ success: false, message: "Not authorized" });
        }
        await swap.deleteOne();
        return res.json({ success: true, message: "Swap listing deleted" });
    }
    catch (err) {
        return res
            .status(500)
            .json({ success: false, message: "Failed to delete swap" });
    }
};
exports.deleteSwap = deleteSwap;
const proposeSwap = async (req, res) => {
    try {
        const proposerId = req.user?.id;
        const swap = await bookswap_model_1.default.findById(req.params.id);
        if (!swap) {
            return res
                .status(404)
                .json({ success: false, message: "Swap listing not found" });
        }
        if (swap.status !== "open") {
            return res.status(400).json({
                success: false,
                message: "This swap is no longer accepting proposals",
            });
        }
        if (swap.ownerId.toString() === proposerId) {
            return res.status(400).json({
                success: false,
                message: "You cannot propose on your own swap",
            });
        }
        const alreadyProposed = swap.proposals.some((p) => p.proposerId.toString() === proposerId && p.status === "pending");
        if (alreadyProposed) {
            return res.status(400).json({
                success: false,
                message: "You already have a pending proposal for this swap",
            });
        }
        const { offeredBookTitle, offeredBookDescription, offeredBookImages, offeredBookCondition, message, } = req.body;
        if (!offeredBookTitle || !offeredBookDescription || !offeredBookCondition) {
            return res.status(400).json({
                success: false,
                message: "offeredBookTitle, offeredBookDescription and offeredBookCondition are required",
            });
        }
        swap.proposals.push({
            proposerId,
            offeredBookTitle,
            offeredBookDescription,
            offeredBookImages: offeredBookImages || [],
            offeredBookCondition,
            message,
            status: "pending",
        });
        if (swap.status === "open") {
            swap.status = "pending";
        }
        await swap.save();
        return res.status(201).json({
            success: true,
            message: "Swap proposal submitted! The owner will review it.",
            data: swap.proposals[swap.proposals.length - 1],
        });
    }
    catch (err) {
        return res
            .status(500)
            .json({ success: false, message: "Failed to submit proposal" });
    }
};
exports.proposeSwap = proposeSwap;
const respondToProposal = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id, proposalId } = req.params;
        const { action } = req.body;
        if (!["accept", "reject"].includes(action)) {
            return res.status(400).json({
                success: false,
                message: "action must be 'accept' or 'reject'",
            });
        }
        const swap = await bookswap_model_1.default.findById(id);
        if (!swap) {
            return res
                .status(404)
                .json({ success: false, message: "Swap not found" });
        }
        if (swap.ownerId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: "Only the swap owner can respond to proposals",
            });
        }
        const proposal = swap.proposals.find((p) => p._id.toString() === proposalId);
        if (!proposal) {
            return res
                .status(404)
                .json({ success: false, message: "Proposal not found" });
        }
        if (proposal.status !== "pending") {
            return res
                .status(400)
                .json({ success: false, message: "Proposal already responded to" });
        }
        if (action === "accept") {
            proposal.status = "accepted";
            swap.status = "completed";
            swap.acceptedProposalId = proposal._id;
            swap.proposals.forEach((p) => {
                if (p._id.toString() !== proposalId && p.status === "pending") {
                    p.status = "rejected";
                }
            });
        }
        else {
            proposal.status = "rejected";
            const stillPending = swap.proposals.some((p) => p.status === "pending");
            if (!stillPending) {
                swap.status = "open";
            }
        }
        await swap.save();
        return res.json({
            success: true,
            message: action === "accept"
                ? "Swap accepted! Contact the proposer to arrange the exchange."
                : "Proposal rejected",
            data: swap,
        });
    }
    catch (err) {
        return res
            .status(500)
            .json({ success: false, message: "Failed to respond to proposal" });
    }
};
exports.respondToProposal = respondToProposal;
const getAllSwapsAdmin = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status)
            filter.status = status;
        const skip = (Number(page) - 1) * Number(limit);
        const [swaps, total] = await Promise.all([
            bookswap_model_1.default.find(filter)
                .populate("ownerId", "name email avatar")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            bookswap_model_1.default.countDocuments(filter),
        ]);
        return res.json({
            success: true,
            data: swaps,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (err) {
        return res
            .status(500)
            .json({ success: false, message: "Failed to fetch swaps" });
    }
};
exports.getAllSwapsAdmin = getAllSwapsAdmin;
