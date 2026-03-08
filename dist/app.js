"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importStar(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const otp_routes_1 = __importDefault(require("./modules/otp/otp.routes"));
const chat_routes_1 = __importDefault(require("./modules/chat/chat.routes"));
const upload_routes_1 = __importDefault(require("./modules/upload/upload.routes"));
const book_routes_1 = __importDefault(require("./modules/book/book.routes"));
const admin_routes_1 = __importDefault(require("./modules/admin/admin.routes"));
const account_routes_1 = __importDefault(require("./modules/account/account.routes"));
const cart_routes_1 = __importDefault(require("./modules/cart/cart.routes"));
const wishlist_routes_1 = __importDefault(require("./modules/wishlist/wishlist.routes"));
const rating_routes_1 = __importDefault(require("./modules/rating/rating.routes"));
const readingstats_routes_1 = __importDefault(require("./modules/readingstats/readingstats.routes"));
const bookmark_routes_1 = __importDefault(require("./modules/bookmark/bookmark.routes"));
const highlight_routes_1 = __importDefault(require("./modules/highlight/highlight.routes"));
const note_routes_1 = __importDefault(require("./modules/note/note.routes"));
const payment_routes_1 = __importDefault(require("./modules/payment/payment.routes"));
const support_routes_1 = __importDefault(require("./modules/support/support.routes"));
const order_routes_1 = __importDefault(require("./modules/order/order.routes"));
const payout_routes_1 = __importDefault(require("./modules/payout/payout.routes"));
const bookswap_routes_1 = __importDefault(require("./modules/bookswap/bookswap.routes"));
const vendor_routes_1 = __importDefault(require("./modules/vendor/vendor.routes"));
const vendor_inventory_routes_1 = __importDefault(require("./modules/vendor/vendor.inventory.routes"));
const readingstats_routes_2 = __importDefault(require("./modules/readingstats/readingstats.routes"));
const app = (0, express_1.default)();
const v1Router = (0, express_1.Router)();
app.use((0, cors_1.default)({
    origin: "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express_1.default.json());
v1Router.use("/auth", auth_routes_1.default);
v1Router.use("/otp", otp_routes_1.default);
v1Router.use("/upload", upload_routes_1.default);
v1Router.use("/books", book_routes_1.default);
v1Router.use("/chat", chat_routes_1.default);
v1Router.use("/admin", admin_routes_1.default);
v1Router.use("/account", account_routes_1.default);
v1Router.use("/cart", cart_routes_1.default);
v1Router.use("/wishlist", wishlist_routes_1.default);
v1Router.use("/ratings", rating_routes_1.default);
v1Router.use("/stats", readingstats_routes_1.default);
v1Router.use("/bookmarks", bookmark_routes_1.default);
v1Router.use("/highlights", highlight_routes_1.default);
v1Router.use("/notes", note_routes_1.default);
v1Router.use("/payment", payment_routes_1.default);
v1Router.use("/support", support_routes_1.default);
v1Router.use("/orders", order_routes_1.default);
v1Router.use("/payouts", payout_routes_1.default);
v1Router.use("/swaps", bookswap_routes_1.default);
v1Router.use("/vendor", vendor_routes_1.default);
v1Router.use("/vendor/inventory", vendor_inventory_routes_1.default);
v1Router.use("/reading-stats", readingstats_routes_2.default);
app.use("/api/v1", v1Router);
exports.default = app;
