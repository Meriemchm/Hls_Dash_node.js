import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import VideoPlayerMain from "./components/VideoPlayerMain";
import HDForm from "./components/HDForm";
import SideBar from "./components/SideBar";
export default function App() {
  return (
    <Router>
      <Routes>
        {/*user side */}
        <Route path="/" element={<SideBar />}>
          <Route index element={<HDForm />} />
          <Route path="/videoPlayer" element={<VideoPlayerMain />} />
        </Route>
      </Routes>

    </Router>
  );
}
