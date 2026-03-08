"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCart = exports.removeFromCart = exports.updateCartItem = exports.addToCart = exports.getCart = void 0;
const cart_model_1 = __importDefault(require("./cart.model"));
const book_model_1 = __importDefault(require("../book/book.model"));
// Get user's cart
const getCart = async (req, res) => {
    try {
        const userId = req.user?.id;
        let cart = await cart_model_1.default.findOne({ userId }).populate("items.bookId");
        if (!cart) {
            cart = await cart_model_1.default.create({ userId, items: [] });
        }
        res.status(200).json({ cart });
    }
    catch (error) {
        console.error("Get cart error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getCart = getCart;
// Add item to cart
const addToCart = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { bookId, quantity = 1 } = req.body;
        if (!bookId) {
            return res.status(400).json({ message: "Book ID is required" });
        }
        const book = await book_model_1.default.findById(bookId);
        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }
        let cart = await cart_model_1.default.findOne({ userId });
        if (!cart) {
            cart = await cart_model_1.default.create({ userId, items: [] });
        }
        const existingItem = cart.items.find((item) => item.bookId.toString() === bookId);
        if (existingItem) {
            existingItem.quantity += quantity;
        }
        else {
            cart.items.push({
                bookId,
                quantity,
                price: book.price,
                addedAt: new Date(),
            });
        }
        await cart.save();
        // Populate and return
        cart = await cart_model_1.default.findById(cart._id).populate("items.bookId");
        res.status(200).json({
            message: "Item added to cart",
            cart,
        });
    }
    catch (error) {
        console.error("Add to cart error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.addToCart = addToCart;
// Update cart item quantity
const updateCartItem = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { bookId } = req.params;
        const { quantity } = req.body;
        if (!quantity || quantity < 1) {
            return res.status(400).json({ message: "Valid quantity is required" });
        }
        const cart = await cart_model_1.default.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }
        const item = cart.items.find((item) => item.bookId.toString() === bookId);
        if (!item) {
            return res.status(404).json({ message: "Item not in cart" });
        }
        item.quantity = quantity;
        await cart.save();
        const updatedCart = await cart_model_1.default.findById(cart._id).populate("items.bookId");
        res.status(200).json({
            message: "Cart updated",
            cart: updatedCart,
        });
    }
    catch (error) {
        console.error("Update cart error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.updateCartItem = updateCartItem;
// Remove item from cart
const removeFromCart = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { bookId } = req.params;
        const cart = await cart_model_1.default.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }
        cart.items = cart.items.filter((item) => item.bookId.toString() !== bookId);
        await cart.save();
        const updatedCart = await cart_model_1.default.findById(cart._id).populate("items.bookId");
        res.status(200).json({
            message: "Item removed from cart",
            cart: updatedCart,
        });
    }
    catch (error) {
        console.error("Remove from cart error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.removeFromCart = removeFromCart;
//  Clear entire cart
const clearCart = async (req, res) => {
    try {
        const userId = req.user?.id;
        const cart = await cart_model_1.default.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }
        cart.items = [];
        cart.totalAmount = 0;
        await cart.save();
        res.status(200).json({
            message: "Cart cleared",
            cart,
        });
    }
    catch (error) {
        console.error("Clear cart error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.clearCart = clearCart;
