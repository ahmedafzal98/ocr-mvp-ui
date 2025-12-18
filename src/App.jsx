// App.jsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import DocumentReviewPage from "./pages/DocumentReviewPage";
import UploadPage from "./pages/UploadPage";
import ReviewResultsPage from "./pages/ReviewResultsPage";
import ExportsPage from "./pages/ExportsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Dashboard page */}
        <Route path="/" element={<Dashboard />} />

        {/* Document review page */}
        <Route
          path="/document-review/:docId"
          element={<DocumentReviewPage />}
        />
        <Route path="/upload-document" element={<UploadPage />} />
        <Route path="/review-results" element={<ReviewResultsPage />} />
        <Route path="/exports" element={<ExportsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
// Updated: Thu Dec 18 23:21:12 PKT 2025
