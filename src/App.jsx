// App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import DocumentReviewPage from "./pages/DocumentReviewPage";
import UploadPage from "./pages/UploadPage";
import ReviewResultsPage from "./pages/ReviewResultsPage";
import ExportsPage from "./pages/ExportsPage";
import LoginPage from "./pages/LoginPage";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/document-review/:docId"
            element={
              <ProtectedRoute>
                <DocumentReviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload-document"
            element={
              <ProtectedRoute>
                <UploadPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/review-results"
            element={
              <ProtectedRoute>
                <ReviewResultsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exports"
            element={
              <ProtectedRoute>
                <ExportsPage />
              </ProtectedRoute>
            }
          />
          
          {/* Catch all - redirect to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
// Updated: Thu Dec 18 23:21:12 PKT 2025
