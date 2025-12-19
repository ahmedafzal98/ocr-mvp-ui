import { useEffect, useState, useRef } from "react";

import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";
import { uploadDocument } from "../services/apiService";

export default function UploadPage() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState({});
  const [processingStatus, setProcessingStatus] = useState({});
  const ws = useRef(null);

  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();
  
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
  const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 
    (window.location.protocol === "https:" ? "wss" : "ws") + "://" + 
    (import.meta.env.VITE_API_BASE_URL ? new URL(import.meta.env.VITE_API_BASE_URL).host : "127.0.0.1:8000");

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const WS_URL = token ? `${WS_BASE_URL}/ws/status?token=${encodeURIComponent(token)}` : `${WS_BASE_URL}/ws/status`;
    ws.current = new WebSocket(WS_URL);

    ws.current.onopen = () => console.log("WebSocket connected");

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setProcessingStatus((prev) => ({
        ...prev,
        [data.doc_id]: data.message,
      }));
    };

    ws.current.onclose = () => console.log("WebSocket disconnected");

    return () => ws.current.close();
  }, []);

  // Handle file selection
  const handleFiles = (files) => {
    const fileArray = Array.from(files);
    setSelectedFiles((prev) => [...prev, ...fileArray]);
  };

  // Remove a file from selection
  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload single file with progress
  const uploadFile = async (file) => {
    try {
      // Use the apiService which has proper configuration and auth headers
      const res = await uploadDocument(file);
      
      toast.success(`${res.data.filename} uploaded successfully!`);

      // Start showing "Processing..." for this doc
      setProcessingStatus((prev) => ({
        ...prev,
        [res.data.id || res.data.doc_id]: "Waiting for processing...",
      }));

      return { ...res.data, doc_id: res.data.id || res.data.doc_id };
    } catch (error) {
      console.error("Upload error:", error);
      let errorMessage = `Failed to upload ${file.name}`;
      
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        errorMessage = `Cannot connect to backend server at ${API_BASE_URL}. Please check the backend URL.`;
      } else if (error.response) {
        errorMessage = `Upload failed: ${error.response.data?.detail || error.response.statusText}`;
      } else if (error.request) {
        errorMessage = "No response from server. Please check if the backend is running.";
      }
      
      toast.error(errorMessage);
      return null;
    }
  };

  // Upload all files
  const uploadAllFiles = async () => {
    if (!selectedFiles.length) return;

    const uploadPromises = selectedFiles.map(file => uploadFile(file));
    await Promise.all(uploadPromises);

    // Clear selected files after upload
    setSelectedFiles([]);
    setUploadingFiles({});
    
    // Wait a moment for documents to be saved, then redirect
    setTimeout(() => {
      navigate("/"); // redirect to dashboard
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <h1 className="text-2xl font-semibold text-gray-800">
          Upload Documents
        </h1>

        {/* Drag & Drop Box */}
        <div
          className="border-4 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-blue-400 transition"
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
          onDragOver={(e) => e.preventDefault()}
        >
          <p className="text-gray-500 mb-4">Drag & Drop files here</p>
          <label className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded cursor-pointer">
            Browse Files
            <input
              type="file"
              multiple
              accept=".pdf,.tiff,.tif,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
          <p className="text-gray-400 mt-2 text-sm">
            Supported formats: PDF, TIFF, JPG, PNG
          </p>
        </div>

        {/* Selected Files Preview */}
        {selectedFiles.length > 0 && (
          <div className="bg-white shadow rounded p-4 space-y-2">
            <h2 className="text-lg font-semibold mb-2">Selected Files</h2>
            {selectedFiles.map((file, idx) => {
              const docId = uploadingFiles[file.name]?.doc_id; // if you store doc_id
              const statusMessage = docId ? processingStatus[docId] : null;

              return (
                <div
                  key={idx}
                  className="flex justify-between items-center border-b last:border-b-0 py-2"
                >
                  <div>
                    <p className="font-medium text-gray-700">{file.name}</p>
                    {uploadingFiles[file.name] !== undefined && (
                      <div className="w-full bg-gray-200 rounded h-2 mt-1">
                        <div
                          className="bg-blue-600 h-2 rounded"
                          style={{ width: `${uploadingFiles[file.name]}%` }}
                        ></div>
                      </div>
                    )}
                    {statusMessage && (
                      <p className="text-sm text-gray-500 mt-1">
                        {statusMessage}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => removeFile(idx)}
                    disabled={uploadingFiles[file.name] !== undefined}
                    className="text-red-500 hover:text-red-700 font-bold"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4 mt-4">
          <button
            onClick={uploadAllFiles}
            disabled={
              !selectedFiles.length || Object.keys(uploadingFiles).length > 0
            }
            className={`px-6 py-2 rounded shadow text-white ${
              selectedFiles.length && Object.keys(uploadingFiles).length === 0
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            Upload All
          </button>
          <button
            onClick={() => setSelectedFiles([])}
            disabled={Object.keys(uploadingFiles).length > 0}
            className="px-6 py-2 rounded shadow bg-gray-200 hover:bg-gray-300 text-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
