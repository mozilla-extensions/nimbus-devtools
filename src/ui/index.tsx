/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter as Router, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import MainPage from "./components/MainPage";
import FeatureConfigPage from "./components/FeatureConfigPage";

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("#app").forEach((el) => {
    const root = createRoot(el);
    root.render(
      <StrictMode>
        <Router>
          <Navbar />
          <Sidebar />
          <div className="main-content">
            <Routes>
              <Route path="/" element={<MainPage />} />
              <Route path="/experiment-json" element={<MainPage />} />
              <Route
                path="/experiment-feature-config"
                element={<FeatureConfigPage />}
              />
            </Routes>
          </div>
        </Router>
      </StrictMode>,
    );
  });
});
