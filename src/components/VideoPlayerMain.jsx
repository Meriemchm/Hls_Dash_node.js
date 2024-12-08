import React, { useState, useEffect } from "react";

import VideoPlayer from "./VideoPlayer";
import { generateRandomSpeed } from "./videoUtils";

const VideoPlayerMain = () => {
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState(null);
  const [debugMessage, setDebugMessage] = useState("");
  const speed = generateRandomSpeed();

  const apiUrl = import.meta.env.VITE_SERVER_IP;

  useEffect(() => {
    const fetchVideos = async () => {
      setDebugMessage("Début de fetchVideos");

      try {
        const response = await fetch(`http://${apiUrl}:3000/segmentsFolder`);

        if (!response.ok) {
          throw new Error("Erreur lors de la récupération des vidéos");
        }

        const data = await response.json();

        setVideos(data);
        setDebugMessage("Vidéos récupérées avec succès");
      } catch (err) {
        setError(err.message);
        setDebugMessage(`Erreur: ${err.message}`);
      }
    };

    fetchVideos();
  }, [apiUrl]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 md:p-12 bg-gray-100">
      {/* <h1 className=" font-bold m-4">Test bande passante : {(speed / 1000000).toFixed(2)}</h1> */}
      {videos &&
        Object.keys(videos).map((folderName, index) => (
          <div
            key={index}
            className="w-full max-w-3xl mb-6 p-4 border border-gray-300 rounded-lg bg-white shadow-md"
          >
            {videos[folderName].map((videoUrl, idx) => (
              <div key={idx} className="mb-4">
                <p className="text-gray-700">
                  File:{" "}
                  <span className="font-semibold">
                    {videoUrl.split("/").pop()}
                  </span>
                </p>

                <VideoPlayer
                  videoId={videoUrl.split("/").pop()}
                  // speed={speed}
                />
              </div>
            ))}
          </div>
        ))}
    </div>
  );
};

export default VideoPlayerMain;
