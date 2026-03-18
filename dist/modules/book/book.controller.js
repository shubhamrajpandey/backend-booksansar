"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyBooks = exports.deleteBookDetails = exports.updateBookDetails = exports.getSingleBook = exports.getAllBooks = exports.uploadBookDetails = void 0;
const http_status_codes_1 = require("http-status-codes");
const book_model_1 = __importDefault(require("../book/book.model"));
const vendor_model_1 = __importDefault(require("../vendor/vendor.model"));
const logger_1 = __importDefault(require("../../utils/logger"));
const uploadBookDetails = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: "Authentication required",
            });
        }
        const { type, title, author, category, genre, description, coverImage, additionalImages, pdfUrl, price, mrp, stock, condition, deliveryInfo, rating, language, edition, negotiable, sellerName, phone, location, printedPrice, bookType, } = req.body;
        const uploader = req.user.id;
        const role = req.user.role;
        if (!type || !title || !author || !category) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "type, title, author, and category are required",
            });
        }
        if (!["free", "physical", "second-hand", "free-notes"].includes(type)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Invalid book type",
            });
        }
        if (type === "physical" && role !== "vendor" && role !== "admin") {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json({
                success: false,
                message: "Only vendors or admins can upload physical books",
            });
        }
        if (type === "second-hand" && role !== "learner" && role !== "admin") {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json({
                success: false,
                message: "Only learners or admins can upload second-hand books",
            });
        }
        // Both free and free-notes require a PDF
        if (type === "free" || type === "free-notes") {
            if (!pdfUrl) {
                return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: `${type === "free-notes" ? "Free notes" : "Free books"} must include a PDF URL`,
                });
            }
        }
        if (type === "physical") {
            if (price === undefined || stock === undefined || !deliveryInfo) {
                return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Physical books require price, stock, and delivery information",
                });
            }
            if (price < 0 || stock < 0) {
                return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Price and stock cannot be negative",
                });
            }
        }
        if (type === "second-hand") {
            if (price === undefined || !condition) {
                return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Second-hand books require price and condition",
                });
            }
            if (!["new", "used-good", "used-ok"].includes(condition)) {
                return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Invalid condition value",
                });
            }
        }
        let vendorId = undefined;
        if (type === "physical") {
            const vendor = await vendor_model_1.default.findOne({ userId: uploader });
            if (!vendor) {
                return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json({
                    success: false,
                    message: "Vendor profile not found. Please complete vendor registration.",
                });
            }
            vendorId = vendor._id;
        }
        // Visibility logic:
        // - admin → always public
        // - physical → public (vendor-approved flow)
        // - free, free-notes, second-hand → pending (needs admin approval)
        let visibility;
        if (role === "admin") {
            visibility = "public";
        }
        else if (type === "physical") {
            visibility = "public";
        }
        else {
            visibility = "pending"; // free, free-notes, second-hand all need approval
        }
        const book = await book_model_1.default.create({
            type,
            title: title.trim(),
            author: author.trim(),
            category,
            genre,
            description,
            coverImage,
            additionalImages,
            pdfUrl,
            price,
            mrp,
            stock,
            condition,
            deliveryInfo,
            rating,
            language,
            edition,
            negotiable,
            sellerName,
            phone,
            location,
            printedPrice,
            bookType,
            uploader,
            vendorId,
            visibility,
        });
        return res.status(http_status_codes_1.StatusCodes.CREATED).json({
            success: true,
            message: visibility === "pending"
                ? "Book uploaded and sent for admin approval"
                : "Book uploaded successfully",
            book,
        });
    }
    catch (error) {
        console.error("UPLOAD BOOK ERROR:", error);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Failed to upload book",
        });
    }
};
exports.uploadBookDetails = uploadBookDetails;
const getAllBooks = async (req, res) => {
    try {
        const { search, type, category, genre, location, author, minPrice, maxPrice, availability, visibility, sortBy, page = 1, limit = 10, } = req.query;
        const filter = {};
        if (req.user?.role === "admin" && visibility) {
            filter.visibility = visibility;
        }
        else {
            filter.visibility = "public";
        }
        if (type && typeof type === "string") {
            const types = type.split(",").map((t) => t.trim());
            filter.type = types.length > 1 ? { $in: types } : type;
        }
        if (availability === "in-stock")
            filter.stock = { $gt: 0 };
        if (availability === "out-of-stock")
            filter.stock = { $lte: 0 };
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice)
                filter.price.$gte = Number(minPrice);
            if (maxPrice)
                filter.price.$lte = Number(maxPrice);
        }
        if (category && typeof category === "string") {
            filter.category = { $in: category.split(",") };
        }
        if (genre && typeof genre === "string") {
            filter.genre = { $in: genre.split(",") };
        }
        if (location && typeof location === "string")
            filter.location = location;
        if (author && typeof author === "string") {
            filter.author = { $regex: author, $options: "i" };
        }
        if (search && typeof search === "string") {
            filter.$or = [
                { title: { $regex: search, $options: "i" } },
                { author: { $regex: search, $options: "i" } },
            ];
        }
        let sort = { createdAt: -1 };
        if (sortBy && typeof sortBy === "string") {
            switch (sortBy) {
                case "price-low-high":
                    sort = { price: 1 };
                    break;
                case "price-high-low":
                    sort = { price: -1 };
                    break;
                case "rating-high-low":
                    sort = { rating: -1 };
                    break;
                case "newest":
                    sort = { createdAt: -1 };
                    break;
                case "title-a-z":
                    sort = { title: 1 };
                    break;
                case "title-z-a":
                    sort = { title: -1 };
                    break;
                case "relevance":
                default:
                    sort = { createdAt: -1 };
                    break;
            }
        }
        const safePage = Number(page) > 0 ? Number(page) : 1;
        const safeLimit = Number(limit) > 0 && Number(limit) <= 100 ? Number(limit) : 10;
        const skip = (safePage - 1) * safeLimit;
        const books = await book_model_1.default.find(filter)
            .populate("uploader", "name email role")
            .sort(sort)
            .skip(skip)
            .limit(safeLimit);
        const total = await book_model_1.default.countDocuments(filter);
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Books retrieved successfully",
            page: safePage,
            limit: safeLimit,
            total,
            totalPages: Math.ceil(total / safeLimit),
            books,
        });
    }
    catch (error) {
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Server error",
        });
    }
};
exports.getAllBooks = getAllBooks;
const getSingleBook = async (req, res) => {
    try {
        const filter = { _id: req.params.id };
        if (req.user?.role !== "admin")
            filter.visibility = "public";
        const book = await book_model_1.default.findOne(filter).populate("uploader", "name email role");
        if (!book) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Book not found",
            });
        }
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Book retrieved successfully",
            book,
        });
    }
    catch (error) {
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Server error",
        });
    }
};
exports.getSingleBook = getSingleBook;
const updateBookDetails = async (req, res) => {
    try {
        const allowedFields = [
            "title",
            "author",
            "category",
            "description",
            "price",
            "stock",
            "condition",
            "location",
            "language",
            "edition",
            "negotiable",
        ];
        const updates = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined)
                updates[field] = req.body[field];
        }
        const book = await book_model_1.default.findById(req.params.id);
        if (!book) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Book not found",
            });
        }
        if (req.user?.role !== "admin" &&
            book.uploader.toString() !== req.user?.id) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json({
                success: false,
                message: "Not allowed",
            });
        }
        const updatedBook = await book_model_1.default.findByIdAndUpdate(req.params.id, updates, {
            new: true,
            runValidators: true,
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Book updated successfully",
            book: updatedBook,
        });
    }
    catch (error) {
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Server error",
        });
    }
};
exports.updateBookDetails = updateBookDetails;
const deleteBookDetails = async (req, res) => {
    try {
        const book = await book_model_1.default.findById(req.params.id);
        if (!book) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Book not found",
            });
        }
        if (req.user?.role !== "admin" &&
            book.uploader.toString() !== req.user?.id) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json({
                success: false,
                message: "Not allowed",
            });
        }
        await book.deleteOne();
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Book deleted successfully",
        });
    }
    catch (error) {
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Server error",
        });
    }
};
exports.deleteBookDetails = deleteBookDetails;
const getMyBooks = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: "Authentication required",
            });
        }
        const { type, page = 1, limit = 20 } = req.query;
        const filter = { uploader: req.user.id };
        if (type && typeof type === "string") {
            filter.type = type;
        }
        const safePage = Number(page) > 0 ? Number(page) : 1;
        const safeLimit = Number(limit) > 0 && Number(limit) <= 100 ? Number(limit) : 20;
        const skip = (safePage - 1) * safeLimit;
        const books = await book_model_1.default.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(safeLimit);
        const total = await book_model_1.default.countDocuments(filter);
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Your books retrieved successfully",
            page: safePage,
            limit: safeLimit,
            total,
            totalPages: Math.ceil(total / safeLimit),
            books,
        });
    }
    catch (error) {
        logger_1.default.error("GET MY BOOKS ERROR:");
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Server error",
        });
    }
};
exports.getMyBooks = getMyBooks;
