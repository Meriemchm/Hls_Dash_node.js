import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { getLocalIpAddress } from "./utils/ipUtils.js";
import { createDirectories, writeToEnvFile } from "./utils/fileUtils.js";
import { segmentVideoHLS,segmentVideoDASH } from "./utils/videoUtils.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = 3000;

const uploadsDir = path.join(__dirname, "uploads");
const segmentsDir = path.join(uploadsDir, "segments");

createDirectories(uploadsDir, segmentsDir);
app.use(cors());
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  })
);
/*--------------------------ip-------------------------- */

const localIp = getLocalIpAddress();
console.log(localIp);

app.get("/get-ip", (req, res) => {
  console.log("Requête reçue pour obtenir l'IP");
  const ip = getLocalIpAddress();
  res.json({ ip });
});

/*-------------------------------video files proprieties--------------------------- */

fs.chmodSync(uploadsDir, 0o755);

app.use("/uploads", express.static("uploads"));


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const sanitizedFileName = file.originalname
      .replace(/[^a-zA-Z0-9-_\.]/g, "-")
      .replace(/--+/g, "-")
      .replace(/^-|-$/g, "");
    cb(null, `${uniqueSuffix}-${sanitizedFileName}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100000000 },
  fileFilter: (req, file, cb) => {
    const fileTypes = /mp4|mkv|avi|mov/;
    const extname = fileTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimeType = fileTypes.test(file.mimetype);

    if (extname && mimeType) cb(null, true);
    else cb(new Error("Format de fichier non pris en charge !"));
  },
});


/*-------------------------------post and get routes--------------------------- */

// app.use('/segments', express.static(path.join(__dirname, 'uploads/segments')));


app.post("/uploadHD", upload.single("video"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const videoName = path.basename(filePath, path.extname(filePath));
    const segmentFolder = path.join(segmentsDir, videoName);

    const { startTime, endTime, segmentationType } = req.body; 
    const resolutions = JSON.parse(req.body.resolutions || "[]");

    console.log("Chemin de la vidéo :", filePath);
    console.log("Résolutions choisies :", resolutions);
    console.log("Protocole choisi :", segmentationType);

    if (!fs.existsSync(segmentFolder))
      fs.mkdirSync(segmentFolder, { recursive: true });

    // protocol
    if (segmentationType === "hls") {
      await segmentVideoHLS(
        filePath,
        segmentFolder,
        Number(startTime),
        Number(endTime),
        resolutions
      );
    } else if (segmentationType === "dash") {
      await segmentVideoDASH(
        filePath,
        segmentFolder,
        Number(startTime),
        Number(endTime),
        resolutions
      );
    } else {
      throw new Error("Protocole invalide. Veuillez choisir 'hls' ou 'dash'.");
    }

    res.status(200).json({
      message: `Vidéo téléversée et segmentée avec succès pour le protocole ${segmentationType}.`,
      file: req.file,
    });
  } catch (error) {
    console.error("Erreur sur le serveur :", error);
    res.status(500).json({
      message: "Erreur lors du téléversement ou de la segmentation de la vidéo",
      error: error.message,
    });
  }
});


//tout les dossiers
app.get("/segmentsFolder", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST");

  fs.readdir(uploadsDir, { withFileTypes: true }, (err, files) => {
    if (err) {
      return res.status(500).json({
        message: "Erreur lors de la lecture du dossier",
        error: err,
      });
    }

    const folderContents = {};
    files.forEach((file) => {
      if (file.isDirectory()) {
        const folderPath = path.join(uploadsDir, file.name);
        console.log(file.name); 

        const folderFiles = fs.readdirSync(folderPath).map((segmentFile) => {
          console.log(segmentFile); 
          return `http://${localIp}:3000/uploads/segments/${encodeURIComponent(segmentFile)}`;
        });

        folderContents[file.name] = folderFiles;
      }
    });

    res.json(folderContents);
  });
});


app.get("/video/playlists/:videoId", (req, res) => {
  const { videoId } = req.params;
  const videoPath = path.join(segmentsDir, videoId);

  if (fs.existsSync(videoPath)) {
    // reso dispo
    const availableResolutions = fs
      .readdirSync(videoPath)
      .filter((folder) => fs.lstatSync(path.join(videoPath, folder)).isDirectory());

    const playlists = [];
    availableResolutions.forEach((resolution) => {
      const resolutionPath = path.join(videoPath, resolution);
      const hlsPlaylistPath = path.join(resolutionPath, "playlist.m3u8");
      const dashManifestPath = path.join(resolutionPath, "manifest.mpd");

      if (fs.existsSync(hlsPlaylistPath)) {
        playlists.push({
          format: "HLS",
          resolution,
          url: `http://${localIp}:3000/uploads/segments/${videoId}/${resolution}/playlist.m3u8`,
        });
      }

      if (fs.existsSync(dashManifestPath)) {
        playlists.push({
          format: "DASH",
          resolution,
          url: `http://${localIp}:3000/uploads/segments/${videoId}/${resolution}/manifest.mpd`,
        });
      }
    });

    if (playlists.length > 0) {
      res.status(200).json({ playlists });
    } else {
      res.status(404).json({ error: "No playlists found for the video" });
    }
  } else {
    res.status(404).json({ error: "Video folder not found" });
  }
});


// app.get("/uploads/segments/:videoId/:resolution/:fileName", (req, res) => {
//   const { videoId, resolution, fileName } = req.params;
//   const filePath = path.join(segmentsDir, videoId, resolution, fileName);

//   if (fs.existsSync(filePath)) {
//     res.setHeader("Access-Control-Allow-Origin", "*");
//     res.setHeader("Access-Control-Allow-Methods", "GET, POST");
//     res.sendFile(filePath);
//   } else {
//     res.status(404).json({ error: "File not found" });
//   }
// });

// app.get('/segments/:filePath(*)', (req, res) => {
//   const filePath = req.params.filePath;
//   const fileLocation = path.join(__dirname, 'segments', filePath);

//   res.sendFile(fileLocation, (err) => {
//     if (err) {
//       console.error(`Erreur lors de l'envoi du fichier : ${err}`);
//       res.status(404).send('Fichier non trouvé');
//     }
//   });
// });


// app.get("/segments", (req, res) => {
//   res.setHeader("Access-Control-Allow-Origin", "*");
//   res.setHeader("Access-Control-Allow-Methods", "GET, POST");

//   const videoId = req.query.videoId; 
//   const resolution = req.query.resolution; // Résolution 

//   const resolutionDir = path.join(segmentsDir, videoId, resolution); // Dossier rsolution pr video

//   fs.readdir(resolutionDir, (err, files) => {
//     if (err) {
//       return res.status(500).json({
//         message: "Erreur lors de la lecture des segments",
//         error: err,
//       });
//     }
//     console.log(files);
//     const segmentFiles = files
//       .filter((file) => file.endsWith(".ts") || file.endsWith(".m4s")) // Filtre les fichiers
//       .map(
//         (file) =>
//           `http://${localIp}:3000/uploads/segments/${videoId}/${resolution}/${encodeURIComponent(
//             file
//           )}`
//       );

//     res.json(segmentFiles); 
//   });
// });


// // résolutions hna
// app.get("/video/resolutions/:videoId", (req, res) => {
//   const { videoId } = req.params;
//   const videoPath = path.join(segmentsDir, videoId);

  
//   if (fs.existsSync(videoPath)) {
//     // sous dossiers resolutions
//     const availableResolutions = fs
//       .readdirSync(videoPath)
//       .filter((folder) => fs.lstatSync(path.join(videoPath, folder)).isDirectory());
//     res.status(200).json({ resolutions: availableResolutions });
//   } else {
//     res.status(404).json({ error: "Video not found" });
//   }
// });

// //hadi la lste des segments t3 plaulist


// app.get("/segmentsList/:videoId", (req, res) => {
//   const videoId = req.params.videoId;
//   const videoFolder = path.join(__dirname, 'uploads', 'segments', videoId);
//   console.log(videoFolder)

//   // Vérifiez si le dossier de la vidéo existe
//   if (fs.existsSync(videoFolder)) {
//     const hlsPlaylistPath = path.join(videoFolder, 'playlist.m3u8');
//     const dashManifestPath = path.join(videoFolder, 'manifest.mpd');

//     // Vérifiez quel fichier de playlist existe et servez-le
//     if (fs.existsSync(hlsPlaylistPath)) {
//       res.setHeader("Access-Control-Allow-Origin", "*");
//       res.setHeader("Access-Control-Allow-Methods", "GET, POST");
//       res.sendFile(hlsPlaylistPath);
//     } else if (fs.existsSync(dashManifestPath)) {
//       res.setHeader("Access-Control-Allow-Origin", "*");
//       res.setHeader("Access-Control-Allow-Methods", "GET, POST");
//       res.sendFile(dashManifestPath);
//     } else {
//       res.status(404).json({ error: 'Neither HLS playlist nor DASH manifest found' });
//     }
//   } else {
//     res.status(404).json({ error: 'Video folder not found' });
//   }
// });






/*server start------------------------------------------------------------- */

app.listen(PORT, "0.0.0.0", () => {
  writeToEnvFile(localIp, __dirname);
  console.log(`Server running on http://${localIp}:${PORT}`);
});

app.use((req, res, next) => {
  console.log(`Requête reçue pour : ${req.url}`);
  next();
});
