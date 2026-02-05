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

const userPreferencesSchema: Schema<IUserPreferences> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
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

// Index
userPreferencesSchema.index({ userId: 1 });

const UserPreferences: Model<IUserPreferences> = mongoose.model<IUserPreferences>(
  "UserPreferences",
  userPreferencesSchema
);

export default UserPreferences;