import React, { useEffect, useState, useRef } from "react";
import Hls from "hls.js";
import dashjs from "dashjs";

const VideoPlayer = ({ videoId }) => {
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef(null);

  useEffect(() => {
    // rles playlists
    fetch(`http://localhost:3000/video/playlists/${videoId}`)
      .then((response) => response.json())
      .then((data) => {
        const updatedPlaylists = data.playlists.map((playlist) => {
          playlist.url = playlist.url.replace(/\\/g, "/");
          return playlist;
        });

        
        updatedPlaylists.sort((a, b) => {
          const resolutionA = parseInt(a.url.split("/")[6].replace(/[^\d]/g, ''), 10); 
          const resolutionB = parseInt(b.url.split("/")[6].replace(/[^\d]/g, ''), 10); 
          return resolutionB - resolutionA; 
        });

        setPlaylists(updatedPlaylists);
        if (updatedPlaylists.length > 0) {
          setSelectedPlaylist(updatedPlaylists[0]);
          setVideoUrl(updatedPlaylists[0].url);
        }
      })
      .catch((error) => {
        console.error("Erreur lors de la récupération des playlists :", error);
      });
  }, [videoId]);

  useEffect(() => {
    if (videoRef.current) {
      const videoElement = videoRef.current;

      if (Hls.isSupported() && videoUrl && videoUrl.endsWith(".m3u8")) {
        const hls = new Hls();
        hls.loadSource(videoUrl);
        hls.attachMedia(videoElement);
        hls.on(Hls.Events.MANIFEST_PARSED, () => setLoading(false));
        return () => {
          hls.destroy();
        };
      } else if (videoUrl && videoUrl.endsWith(".mpd")) {
        const player = dashjs.MediaPlayer().create();
        player.initialize(videoElement, videoUrl, false);
        player.updateSettings({ debug: { logLevel: dashjs.Debug.LOG_LEVEL_DEBUG } });
        player.on("loadedmetadata", () => setLoading(false));
        return () => {
          player.destroy();
        };
      }
    }
  }, [videoUrl]);

  const handlePlaylistChange = (event) => {
    const selected = event.target.value;
    const selectedData = playlists.find((playlist) => playlist.url === selected);
    setSelectedPlaylist(selectedData);
    setVideoUrl(selectedData ? selectedData.url : null);
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-gray-100">
      <div className="flex flex-col items-center justify-center">
        {/* rsolutions */}
        <select
          id="playlist"
          onChange={handlePlaylistChange}
          value={selectedPlaylist ? selectedPlaylist.url : ""}
          className="mb-4 p-2 border rounded"
        >
          {playlists.map((playlist, index) => {
            const resolutionName = playlist.url.split("/")[6]; 
            return (
              <option key={index} value={playlist.url}>
                {playlist.format} - {resolutionName}
              </option>
            );
          })}
        </select>
      </div>

      <div>
        {videoUrl && (
          <div>
            <video
              controls
              width="640"
              height="360"
              style={{ backgroundColor: "#000" }}
              aria-label="Lecteur vidéo"
              title="Lecteur vidéo"
              ref={videoRef}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;
