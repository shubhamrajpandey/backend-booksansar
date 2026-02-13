// controllers/order.controller.ts
import { StatusCodes } from "http-status-codes";
import { Request, Response } from "express";
import Book, { IBook } from "../models/book.model";
import Order from "../models/order.model";
import mongoose from "mongoose";

export const createOrder = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Order must contain at least one item",
      });
    }

    const bookIds = items.map((i: any) => i.bookId);

    // Cast to IBook[] so _id is properly typed
    const books = await Book.find({
      _id: { $in: bookIds },
      visibility: "public",
      type: "physical",
    }).lean<IBook[]>();

    if (books.length !== bookIds.length) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "One or more books are unavailable",
      });
    }

    // Check stock
    for (const item of items) {
      const book = books.find(
        (b) => (b._id as mongoose.Types.ObjectId).toString() === item.bookId
      );
      if (!book) continue;
      if ((book.stock ?? 0) < item.quantity) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: `Insufficient stock for "${book.title}"`,
        });
      }
    }

    // Build order items
    const orderItems = items.map((item: any) => {
      const book = books.find(
        (b) => (b._id as mongoose.Types.ObjectId).toString() === item.bookId
      )!;
      return {
        book: book._id,
        title: book.title,
        author: book.author,
        price: book.price!,
        quantity: item.quantity,
        image: book.additionalImages?.[0] || "",
      };
    });

    const subtotal = orderItems.reduce(
      (sum: number, i: any) => sum + i.price * i.quantity,
      0
    );

    const order = await Order.create({
      user: req.user.id,
      items: orderItems,
      subtotal,
      shipping: 0,
      total: subtotal,
      status: "pending",
    });

    // Decrement stock for each book
    for (const item of items) {
      await Book.findByIdAndUpdate(item.bookId, {
        $inc: { stock: -item.quantity },
      });
    }

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Order created successfully",
      order,
    });
  } catch (error) {
    console.error("CREATE ORDER ERROR:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to create order",
    });
  }
};