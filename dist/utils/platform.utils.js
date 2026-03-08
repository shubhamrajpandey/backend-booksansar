"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveBackupMetadata = exports.getLastBackupTime = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const getLastBackupTime = async () => {
    try {
        const backupMetaPath = path_1.default.join(__dirname, "../../backups/last-backup.json");
        if (fs_1.default.existsSync(backupMetaPath)) {
            const data = fs_1.default.readFileSync(backupMetaPath, "utf-8");
            const backupInfo = JSON.parse(data);
            return backupInfo.formattedDate;
        }
        return "No backup available";
    }
    catch (error) {
        console.error("Error reading backup info:", error);
        return "Unknown";
    }
};
exports.getLastBackupTime = getLastBackupTime;
const saveBackupMetadata = async () => {
    try {
        const backupDir = path_1.default.join(__dirname, "../../backups");
        if (!fs_1.default.existsSync(backupDir)) {
            fs_1.default.mkdirSync(backupDir, { recursive: true });
        }
        const now = new Date();
        const backupInfo = {
            timestamp: now.toISOString(),
            formattedDate: now.toLocaleString("en-US", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
            }),
        };
        const metaPath = path_1.default.join(backupDir, "last-backup.json");
        fs_1.default.writeFileSync(metaPath, JSON.stringify(backupInfo, null, 2));
    }
    catch (error) {
        console.error("Error saving backup metadata:", error);
    }
};
exports.saveBackupMetadata = saveBackupMetadata;
