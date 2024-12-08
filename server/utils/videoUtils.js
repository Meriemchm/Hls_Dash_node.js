import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { exec } from "child_process";

export const segmentVideoHLS = (
  filePath,
  baseSegmentFolder,
  startTime,
  endTime,
  resolutions,
  segmentDuration = 10
) => {
  return new Promise((resolve, reject) => {
    const resolutionMap = {
      "480p": "scale=854:480",
      "720p": "scale=1280:720",
      "1080p": "scale=1920:1080",
    };

    const promises = resolutions.map((label) => {
      return new Promise((res, rej) => {
        const segmentFolder = path.join(baseSegmentFolder, label);
        if (!fs.existsSync(segmentFolder)) {
          fs.mkdirSync(segmentFolder, { recursive: true });
        }

        const scaleFilter = resolutionMap[label] || "scale=1280:-2";

        ffmpeg(filePath)
          .setStartTime(startTime)
          .setDuration(endTime - startTime)
          .videoFilter(scaleFilter)
          .audioCodec("aac")
          .output(path.join(segmentFolder, "playlist.m3u8"))
          .outputOptions([
            "-preset",
            "ultrafast",
            "-f",
            "hls",
            "-hls_time",
            segmentDuration.toString(),
            "-hls_playlist_type",
            "vod",
            "-hls_list_size",
            "0",
            "-hls_segment_filename",
            path.join(segmentFolder, "segment-%03d.ts"),
          ])
          .on("start", (commandLine) => {
            console.log("Commande FFmpeg HLS : " + commandLine);
          })
          .on("end", () => {
            console.log(`Segmentation HLS terminée pour ${label}.`);
            res(`Segmentation HLS réussie pour ${label}`);
          })
          .on("error", (err, stdout, stderr) => {
            console.error("Erreur lors de la segmentation HLS :", stderr);
            rej({ error: stderr, command: err });
          })
          .run();
      });
    });

    Promise.all(promises)
      .then((results) => resolve(results))
      .catch((error) => reject(error));
  });
};

export const segmentVideoDASH = (
  filePath,
  baseSegmentFolder,
  startTime,
  endTime,
  resolutions,
  segmentDuration = 10,
  baseUrl = "http://localhost:3000/uploads/segments"
) => {
  return new Promise((resolve, reject) => {
    const resolutionMap = {
      "480p": "scale=854:480",
      "720p": "scale=1280:720",
      "1080p": "scale=1920:1080",
    };

    const promises = resolutions.map((label) => {
      return new Promise((res, rej) => {
        const segmentFolder = path.join(baseSegmentFolder, label);
        if (!fs.existsSync(segmentFolder)) {
          fs.mkdirSync(segmentFolder, { recursive: true });
        }

        const scaleFilter = resolutionMap[label] || "scale=1280:-2";

        const initSegmentPath = path.join(
          segmentFolder,
          "init-stream$RepresentationID$.m4s"
        );
        const mediaSegmentPath = path.join(
          segmentFolder,
          "chunk-stream$RepresentationID$-$Number$.m4s"
        );
        const manifestPath = path.join(segmentFolder, "manifest.mpd");

        ffmpeg(filePath)
          .setStartTime(startTime)
          .setDuration(endTime - startTime)
          .videoFilter(scaleFilter)
          .audioCodec("aac")
          .output(manifestPath)
          .format("dash")
          .outputOptions([
            "-preset",
            "ultrafast",
            "-f",
            "dash",
            "-seg_duration",
            segmentDuration.toString(),
            "-use_template",
            "1",
            "-use_timeline",
            "1",
            "-init_seg_name",
            initSegmentPath,
            "-media_seg_name",
            mediaSegmentPath,
          ])
          .on("start", (commandLine) => {
            console.log("Commande FFmpeg DASH : " + commandLine);
          })
          .on("end", () => {
            console.log(`Segmentation DASH terminée pour ${label}.`);

            // Fonction pour échapper les caractères spéciaux dans une expression régulière
            function escapeRegExp(string) {
              return string.replace(/[.*+?^=!:${}()|\[\]\/\\]/g, "\\$&");
            }

            fs.readFile(manifestPath, "utf8", (err, data) => {
              if (err) {
                return rej({
                  error: "Erreur de lecture du manifeste",
                  details: err,
                });
              }

              // Log du contenu du fichier manifeste pour débogage
              console.log("Contenu du manifeste original :", data);

              // Log pour vérifier la présence des chemins absolus
              console.log(
                "Chemin absolu init dans le manifeste:",
                data.match(
                  /D:\\Documents\\vs\\Master-2\\TPCMM\\hls_dash\\server\\uploads[^\"]+/g
                )
              );

              // Résoudre les chemins absolus pour s'assurer qu'ils sont bien comparés
              const absoluteInitPath = path.resolve(
                segmentFolder,
                "init-stream$RepresentationID$.m4s"
              );
              const absoluteMediaPath = path.resolve(
                segmentFolder,
                "chunk-stream$RepresentationID$-$Number$.m4s"
              );

              console.log("Chemin absolu init:", absoluteInitPath);
              console.log("Chemin absolu media:", absoluteMediaPath);

              // Utilisation de l'expression régulière avec les chemins échappés
              let modifiedData = data
                .replace(
                  new RegExp(escapeRegExp(absoluteInitPath), "g"),
                  path.join("init-stream$RepresentationID$.m4s")
                )
                .replace(
                  new RegExp(escapeRegExp(absoluteMediaPath), "g"),
                  path.join(
                    "chunk-stream$RepresentationID$-$Number$.m4s"
                  )
                );

              // Log du manifeste modifié pour vérifier le changement
              console.log("Contenu du manifeste modifié :", modifiedData);

              // Enregistrer le fichier manifeste modifié avec des chemins relatifs
              fs.writeFile(manifestPath, modifiedData, "utf8", (err) => {
                if (err) {
                  return rej({
                    error: "Erreur de modification du manifeste",
                    details: err,
                  });
                }

                res(`Segmentation DASH réussie pour ${label}`);
              });
            });
          })
          .on("error", (err, stdout, stderr) => {
            console.error("Erreur lors de la segmentation DASH :", stderr);
            rej({ error: stderr, command: err });
          })
          .run();
      });
    });

    Promise.all(promises)
      .then((results) => resolve(results))
      .catch((error) => reject(error));
  });
};
