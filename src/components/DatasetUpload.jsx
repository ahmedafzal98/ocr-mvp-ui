import React, { useState } from "react";
import { uploadDataset } from "../services/documentService";

function DatasetUpload({ onUpload }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const response = await uploadDataset(file);
      onUpload(response.data);
      alert("Dataset uploaded successfully!");
    } catch (err) {
      console.error(err);
      alert("Error uploading dataset");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md mb-6">
      <h2 className="text-xl font-semibold mb-4">Upload Dataset</h2>
      <input
        type="file"
        accept=".json,.csv, .xlsx"
        onChange={(e) => setFile(e.target.files[0])}
        className="mb-4 w-full"
      />
      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition font-semibold"
      >
        {loading ? "Uploading..." : "Upload Dataset"}
      </button>
    </div>
  );
}

export default DatasetUpload;
