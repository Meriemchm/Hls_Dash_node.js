import fs from "fs";
import path from "path";

export const createDirectories = (uploadsDir, segmentsDir) => {
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(segmentsDir)) fs.mkdirSync(segmentsDir, { recursive: true });
  fs.chmodSync(uploadsDir, 0o755);
};

export const writeToEnvFile = (ip, __dirname) => {
  const envFilePath = path.join(__dirname, "..", ".env");
  const content = `VITE_SERVER_IP="${ip}"\n`;

  fs.writeFile(envFilePath, content, (err) => {
    if (err) {
      console.error("Erreur lors de l'écriture dans le fichier .env :", err);
    } else {
      console.log(`Adresse IP ${ip} écrite dans le fichier .env`);
    }
  });
};
