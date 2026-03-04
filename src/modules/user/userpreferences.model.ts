import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotificationSettings {
  emailNotifications: boolean;
  orderUpdates: boolean;
  streakReminders: boolean;
  promotionalOffers: boolean;
}

export interface IUserPreferences extends Document {
  userId: mongoose.Types.ObjectId;
  notifications: INotificationSettings;
  theme: "light" | "dark" | "system";
  language: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSettingsSchema = new Schema(
  {
    emailNotifications: { type: Boolean, default: true },
    orderUpdates: { type: Boolean, default: true },
    streakReminders: { type: Boolean, default: true },
    promotionalOffers: { type: Boolean, default: true },
  },
  { _id: false }
);

const userPreferencesSchema = new Schema<IUserPreferences>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // ← index handled here
    },

    notifications: {
      type: notificationSettingsSchema,
      default: () => ({}),
    },

    theme: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "light",
    },

    language: {
      type: String,
      default: "en",
    },
  },
  { timestamps: true }
);

const UserPreferences: Model<IUserPreferences> =
  mongoose.models.UserPreferences ||
  mongoose.model<IUserPreferences>("UserPreferences", userPreferencesSchema);

export default UserPreferences;
