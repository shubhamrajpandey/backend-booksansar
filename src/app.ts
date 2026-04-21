import express, { Router } from "express";
import cors from "cors";

import authRoute from "./modules/auth/auth.routes";
import otpRoute from "./modules/otp/otp.routes";
import chatRoute from "./modules/chat/chat.routes";
import uploadRoute from "./modules/upload/upload.routes";
import bookRoute from "./modules/book/book.routes";
import adminRoute from "./modules/admin/admin.routes";
import accountRoute from "./modules/account/account.routes";
import cartRoute from "./modules/cart/cart.routes";
import wishlistRoute from "./modules/wishlist/wishlist.routes";
import ratingRoute from "./modules/rating/rating.routes";
import readingStatsRouter from "./modules/readingstats/readingstats.routes";
import bookmarkRoute from "./modules/bookmark/bookmark.routes";
import highlightRoute from "./modules/highlight/highlight.routes";
import noteRoute from "./modules/note/note.routes";
import paymentRoutes from "./modules/payment/payment.routes";
import supportRoutes from "./modules/support/support.routes";
import orderRoutes from "./modules/order/order.routes";
import payoutRoutes from "./modules/payout/payout.routes";
import bookSwapRoute from "./modules/bookswap/bookswap.routes";
import vendorRoutes from "./modules/vendor/vendor.routes";
import vendorInventoryRoutes from "./modules/vendor/vendor.inventory.routes";
import readingStatsRoutes from "./modules/readingstats/readingstats.routes";
import notificationRoutes from "./modules/notification/notification.routes";
import vendorDashboardRoutes from "./modules/vendor/vendor.dashboard.routes";
import aiRoutes from "./modules/ai/ai.routes";
import riderRoutes from "./modules/rider/rider.application.routes";
import commentRoutes from "./modules/comment/comment.routes";

const app = express();
const v1Router = Router();

app.use(
  cors({
    origin: ["http://localhost:3000", "http://192.168.1.103:5000", "https://booksansar-frontend.vercel.app"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

v1Router.use("/auth", authRoute);
v1Router.use("/otp", otpRoute);
v1Router.use("/upload", uploadRoute);
v1Router.use("/books", bookRoute);
v1Router.use("/chat", chatRoute);
v1Router.use("/admin", adminRoute);
v1Router.use("/account", accountRoute);
v1Router.use("/cart", cartRoute);
v1Router.use("/wishlist", wishlistRoute);
v1Router.use("/ratings", ratingRoute);
v1Router.use("/stats", readingStatsRouter);
v1Router.use("/bookmarks", bookmarkRoute);
v1Router.use("/highlights", highlightRoute);
v1Router.use("/notes", noteRoute);
v1Router.use("/payment", paymentRoutes);
v1Router.use("/support", supportRoutes);
v1Router.use("/orders", orderRoutes);
v1Router.use("/payouts", payoutRoutes);
v1Router.use("/swaps", bookSwapRoute);
v1Router.use("/vendor", vendorRoutes);
v1Router.use("/vendor/inventory", vendorInventoryRoutes);
v1Router.use("/reading-stats", readingStatsRoutes);
v1Router.use("/notifications", notificationRoutes);
v1Router.use("/vendor/dashboard", vendorDashboardRoutes);
v1Router.use("/ai", aiRoutes);
v1Router.use("/rider", riderRoutes);
v1Router.use("/comments", commentRoutes);

app.use("/api/v1", v1Router);

export default app;
