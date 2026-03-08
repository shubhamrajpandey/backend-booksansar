"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVendorBook = exports.updateVendorBook = exports.getVendorInventory = void 0;
const http_status_codes_1 = require("http-status-codes");
const book_model_1 = __importDefault(require("../book/book.model"));
const vendor_model_1 = __importDefault(require("../vendor/vendor.model"));
// GET /vendor/inventory
const getVendorInventory = async (req, res) => {
    try {
        const userId = req.user?.id;
        const vendor = await vendor_model_1.default.findOne({ userId });
        if (!vendor) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Vendor profile not found",
            });
        }
        const { search, page = 1, limit = 10, status } = req.query;
        const filter = {
            vendorId: vendor._id,
            type: "physical",
        };
        if (status === "in-stock")
            filter.stock = { $gt: 0 };
        if (status === "out-of-stock")
            filter.stock = { $lte: 0 };
        if (search && typeof search === "string") {
            filter.$or = [
                { title: { $regex: search, $options: "i" } },
                { author: { $regex: search, $options: "i" } },
            ];
        }
        const safePage = Number(page) > 0 ? Number(page) : 1;
        const safeLimit = Number(limit) > 0 && Number(limit) <= 100 ? Number(limit) : 10;
        const skip = (safePage - 1) * safeLimit;
        const [books, total] = await Promise.all([
            book_model_1.default.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(safeLimit)
                .select("title author price stock visibility additionalImages coverImage category language edition createdAt"),
            book_model_1.default.countDocuments(filter),
        ]);
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            page: safePage,
            limit: safeLimit,
            total,
            totalPages: Math.ceil(total / safeLimit),
            books,
        });
    }
    catch (error) {
        console.error("Get vendor inventory error:", error);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Server error",
        });
    }
};
exports.getVendorInventory = getVendorInventory;
// PATCH /vendor/inventory/:id
const updateVendorBook = async (req, res) => {
    try {
        const userId = req.user?.id;
        const vendor = await vendor_model_1.default.findOne({ userId });
        if (!vendor) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Vendor profile not found",
            });
        }
        const book = await book_model_1.default.findOne({
            _id: req.params.id,
            vendorId: vendor._id,
        });
        if (!book) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Book not found or you don't have permission",
            });
        }
        const allowedFields = [
            "title",
            "author",
            "category",
            "description",
            "price",
            "mrp",
            "stock",
            "language",
            "edition",
            "deliveryInfo",
            "negotiable",
            "additionalImages",
        ];
        const updates = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined)
                updates[field] = req.body[field];
        }
        if (updates.price !== undefined && updates.price < 0) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Price cannot be negative",
            });
        }
        if (updates.stock !== undefined && updates.stock < 0) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Stock cannot be negative",
            });
        }
        const updated = await book_model_1.default.findByIdAndUpdate(req.params.id, updates, {
            new: true,
            runValidators: true,
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Book updated successfully",
            book: updated,
        });
    }
    catch (error) {
        console.error("Update vendor book error:", error);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Server error",
        });
    }
};
exports.updateVendorBook = updateVendorBook;
// DELETE /vendor/inventory/:id
const deleteVendorBook = async (req, res) => {
    try {
        const userId = req.user?.id;
        const vendor = await vendor_model_1.default.findOne({ userId });
        if (!vendor) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Vendor profile not found",
            });
        }
        const book = await book_model_1.default.findOne({
            _id: req.params.id,
            vendorId: vendor._id,
        });
        if (!book) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Book not found or you don't have permission",
            });
        }
        await book.deleteOne();
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Book deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete vendor book error:", error);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Server error",
        });
    }
};
exports.deleteVendorBook = deleteVendorBook;
