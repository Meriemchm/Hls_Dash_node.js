// videoUtils.js

import notfind from "../assets/notFind.jpg";
import {ResolutionMap} from "./bandwidthToResolutionMap"

export const generateRandomSpeed = () => {

  return Math.random() * (20000000 - 500000) + 500000;
};

export async function checkBandwidthWithFirstSegment(
  serverIp,
  videoId,
  speed,
  availableResolutions,
  setResolution
) {
  try {

    const sortedResolutions = [...availableResolutions].sort(
      (a, b) => parseInt(a) - parseInt(b)
    );
    const lowestResolution = sortedResolutions[0]; // Plus petite résolution

    // const startTime = Date.now();
    // const firstSegmentUrl = `http://${serverIp}:3000/uploads/segments/${videoId}/${lowestResolution}/segment_000.mp4`;

    // const response = await fetch(firstSegmentUrl);
    // if (!response.ok) throw new Error(`Error downloading: ${response.status}`);

    // // Taille du fichier
    // const blob = await response.blob();
    // const duration = (Date.now() - startTime) / 1000; // Temps en secondes
    // const bitsLoaded = blob.size * 8; // Taille en bits

    // // Calcul de la vitesse en bits par seconde
    // const speed = bitsLoaded / duration;

    // console.log(
    //   `Test avec bande passante simulée : ${(speed / 1000000).toFixed(2)} Mbps`
    // );

    for (const mapping of ResolutionMap) {
      if (
        speed / 1000000 >= mapping.minSpeed &&
        speed / 1000000 <= mapping.maxSpeed
      ) {
        if (sortedResolutions.includes(mapping.resolution)) {
          setResolution(mapping.resolution);
        } else {
          setResolution(lowestResolution); //  rés pas dispon
        }
        return;
      }
    }
    setResolution(lowestResolution);
  } catch (error) {
    console.error("Failed to check bandwidth with the first segment:", error);
  }
}

// Charge segments vidéo en fon rsolution
export const loadVideoSegments = async (
  serverIp,
  videoId,
  resolution,
  setVideoSources,
  setCurrentSegmentIndex,
  calculateTotalDuration
) => {
  try {
    const response = await fetch(
      `http://${serverIp}:3000/segmentsList/${videoId}`
    );

    if (!response.ok) throw new Error("Error loading segment list");

    const segmentsList = await response.json();
    // console.log(segmentsList)
    //loop to
    const segmentUrls = segmentsList.map(
      (segment) =>
        `http://${serverIp}:3000/uploads/segments/${videoId}/${resolution}/${segment}`
    );
    // console.log(segmentUrls)

    setVideoSources(segmentUrls);

    // currentindex
    setCurrentSegmentIndex((prevIndex) =>
      prevIndex < segmentUrls.length ? prevIndex : 0
    );

    calculateTotalDuration(segmentUrls);
  } catch (error) {
    console.error("Failed to load video segments:", error);
  }
};

export const getVideoDuration = (url) => {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.src = url;
    video.onloadedmetadata = () => {
      resolve(video.duration);
    };
  });
};

export async function calculateTotalDuration(segments, setTotalDuration) {
  let total = 0;
  for (const segment of segments) {
    const segmentDuration = await getVideoDuration(segment);
    total += segmentDuration;
  }
  setTotalDuration(total);
}

//image

export const checkSegmentExists = async (url) => {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch (error) {
    return false;
  }
};

const generateThumbnailFromVideo = async (videoUrl, time) => {
  const video = document.createElement("video");
  video.src = videoUrl;
  video.currentTime = time;
  video.crossOrigin = "anonymous";

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  const exists = await checkSegmentExists(videoUrl);
  if (!exists) {
    return { thumbnailUrl: notfind, isAvailable: false, size: 0 };
  }

  // segt size
  let size = 0;
  try {
    const response = await fetch(videoUrl, { method: "HEAD" });
    if (response.ok) {
      const contentLength = response.headers.get("Content-Length");
      size = contentLength ? parseInt(contentLength, 10) : 0;
    }
  } catch (error) {
    console.error("Error fetching segment size:", error);
  }

  return new Promise((resolve) => {
    video.onloadeddata = () => {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const thumbnailUrl = canvas.toDataURL("image/png");
      resolve({ thumbnailUrl, isAvailable: true, size });
    };
  });
};

export const generateThumbnails = async (segments, setThumbnails) => {
  const thumbnailPromises = segments.map(async (segmentUrl, index) => {
    try {
      const { thumbnailUrl, isAvailable, size } =
        await generateThumbnailFromVideo(segmentUrl, 2);
      return { index, thumbnailUrl, isAvailable, size }; // Inclure la taille
    } catch (error) {
      return { index, thumbnailUrl: notfind, isAvailable: false, size: 0 }; // Taille par défaut
    }
  });

  const thumbnailsData = await Promise.all(thumbnailPromises);
  setThumbnails(thumbnailsData);
};
