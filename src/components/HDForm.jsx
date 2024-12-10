import React, { useState, useRef } from "react";

const HDForm = () => {
  const [selectedResolutions, setSelectedResolutions] = useState({
    "240p": false,
    "360p": false,
    "480p": false,
    "640p": false,
    "720p": false,
    "1080p": false,
  });
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [videoFile, setVideoFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [segmentationType, setSegmentationType] = useState("hls"); // Nouvel état
  const apiUrl = import.meta.env.VITE_SERVER_IP;

  const videoRef = useRef(null);

  const handleResolutionChange = (event) => {
    const { name, checked } = event.target;
    setSelectedResolutions((prevState) => ({
      ...prevState,
      [name]: checked,
    }));
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!videoFile) {
      alert("Veuillez sélectionner une vidéo.");
      return;
    }

    const formData = new FormData();
    formData.append("video", videoFile);
    formData.append("startTime", startTime);
    formData.append("endTime", endTime);

    const selectedRes = Object.keys(selectedResolutions).filter(
      (key) => selectedResolutions[key]
    );
    formData.append("resolutions", JSON.stringify(selectedRes));
    formData.append("segmentationType", segmentationType); 

    try {
      setIsProcessing(true);
      const response = await fetch(`http://${apiUrl}:3000/uploadHD`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        alert("Vidéo téléversée et segmentée avec succès !");
        console.log("Réponse du serveur :", data);
      } else {
        throw new Error("Erreur lors du téléversement de la vidéo.");
      }
    } catch (error) {
      console.error("Erreur lors du téléversement :", error);
      alert("Erreur lors du téléversement de la vidéo.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    setVideoFile(file);
    const video = videoRef.current;
    video.src = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      setEndTime(Math.floor(video.duration)); // entier
    };
  };

  const handleSegmentationChange = (e) => {
    setSegmentationType(e.target.value);
  };

  return (
    <div className="flex flex-col md:justify-center items-center w-full min-h-screen bg-gray-100">
      <form
        className="flex flex-col w-full max-w-xl bg-white rounded-lg shadow-md"
        onSubmit={handleUpload}
      >
        <div className="flex flex-col justify-center mx-auto w-full p-6 sm:p-12">
          <label className="mb-4 text-lg font-semibold text-gray-700">
            Sélectionnez une vidéo :
          </label>
          <input
            type="file"
            name="video"
            accept="video/*"
            onChange={handleVideoChange}
            className="py-2 px-4 mb-6 border border-gray-300 rounded-lg w-full"
            required
          />

          <video ref={videoRef} className="hidden" />

          <label className="mb-4 text-lg font-semibold text-gray-700">
            Choisissez les résolutions :
          </label>
          <div className="flex flex-col mb-6">
            {["240p", "360p", "480p", "640p", "720p", "1080p"].map((res) => (
              <div key={res} className="flex items-center mb-2">
                <input
                  type="checkbox"
                  name={res}
                  checked={selectedResolutions[res]}
                  onChange={handleResolutionChange}
                  className="mr-2"
                />
                <label>{res}</label>
              </div>
            ))}
          </div>

          <label className="mb-4 text-lg font-semibold text-gray-700">
            Type de segmentation :
          </label>
          <select
            value={segmentationType}
            onChange={handleSegmentationChange}
            className="py-2 px-4 mb-6 border border-gray-300 rounded-lg w-full"
            required
          >
            {/*<option value="normal">Normal</option>*/}
            <option value="hls">HLS</option>
            <option value="dash">DASH</option>
          </select>

          <div className="flex flex-col sm:flex-row sm:space-x-4 mb-5">
            <div className="flex flex-col mb-4 sm:mb-0 w-full sm:w-1/2">
              <label>Début (s) :</label>
              <input
                type="number"
                min="0"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="py-2 px-4 border border-gray-300 rounded-lg w-full sm:w-36"
              />
            </div>
            <div className="flex flex-col w-full sm:w-1/2">
              <label>Fin (s) :</label>
              <input
                type="number"
                min="0"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="py-2 px-4 border border-gray-300 rounded-lg w-full sm:w-36"
              />
            </div>
          </div>

          <button
            type="submit"
            className="py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-500 w-full sm:w-auto"
            disabled={isProcessing}
          >
            {isProcessing ? "Veuillez patienter..." : "Téléverser la vidéo"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default HDForm;
