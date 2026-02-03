import fs from "fs";
import path from "path";

interface BackupInfo {
  timestamp: string;
  formattedDate: string;
}

export const getLastBackupTime = async (): Promise<string> => {
  try {
    const backupMetaPath = path.join(__dirname, "../../backups/last-backup.json");

    if (fs.existsSync(backupMetaPath)) {
      const data = fs.readFileSync(backupMetaPath, "utf-8");
      const backupInfo: BackupInfo = JSON.parse(data);
      return backupInfo.formattedDate;
    }

    return "No backup available";
  } catch (error) {
    console.error("Error reading backup info:", error);
    return "Unknown";
  }
};

export const saveBackupMetadata = async (): Promise<void> => {
  try {
    const backupDir = path.join(__dirname, "../../backups");

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const now = new Date();
    const backupInfo: BackupInfo = {
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

    const metaPath = path.join(backupDir, "last-backup.json");
    fs.writeFileSync(metaPath, JSON.stringify(backupInfo, null, 2));
  } catch (error) {
    console.error("Error saving backup metadata:", error);
  }
};