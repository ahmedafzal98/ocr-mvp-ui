import React, { useState } from "react";
import { uploadDocument, fetchExportById } from "../services/documentService";

function FileUpload({ uploaderId = "test_user", onResults }) {
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState({});
  const [errors, setErrors] = useState({});

  const handleUpload = async () => {
    const newLoading = {};
    files.forEach((file) => (newLoading[file.name] = 0));
    setLoadingFiles(newLoading);

    const resultsAccumulator = [];

    await Promise.all(
      files.map(async (file) => {
        try {
          setLoadingFiles((prev) => ({ ...prev, [file.name]: 10 }));
          const response = await uploadDocument(file, uploaderId);
          const doc_id = response.data.doc_id;

          let status = "processing";
          while (status === "processing") {
            const { data } = await fetchExportById(doc_id);
            if (data.status === "processing") {
              setLoadingFiles((prev) => ({
                ...prev,
                [file.name]: Math.min(prev[file.name] + 5, 90),
              }));
              await new Promise((r) => setTimeout(r, 2000));
            } else {
              status = "ready";
              resultsAccumulator.push({
                docId: doc_id,
                fileName: file.name,
                exportUrl: data.signed_url,
              });
              setLoadingFiles((prev) => ({ ...prev, [file.name]: 100 }));
            }
          }
        } catch (err) {
          console.error(err);
          setLoadingFiles((prev) => ({ ...prev, [file.name]: 0 }));
          setErrors((prev) => ({ ...prev, [file.name]: "Upload failed" }));
        }
      })
    );

    onResults(resultsAccumulator); // push all results at once
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-xl font-semibold mb-4">Upload Documents</h2>
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        multiple
        onChange={(e) => setFiles(Array.from(e.target.files))}
        className="mb-4 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      <button
        onClick={handleUpload}
        disabled={files.length === 0}
        className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition font-semibold mb-4"
      >
        Upload & Process
      </button>

      {files.map((file) => (
        <div key={file.name} className="mb-3">
          <p className="text-sm text-gray-700">
            {file.name}{" "}
            {errors[file.name] && (
              <span className="text-red-500">({errors[file.name]})</span>
            )}
          </p>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all duration-300"
              style={{
                width: `${loadingFiles[file.name] || 0}%`,
                backgroundColor:
                  loadingFiles[file.name] >= 100 ? "#22c55e" : "#3b82f6",
              }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default FileUpload;
