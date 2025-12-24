import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { fetchDocuments } from "../services/documentService";
import Navbar from "../components/Navbar";
import Modal from "../components/Modal";
import { useModal } from "../hooks/useModal";
import { API_BASE_URL } from "../config/api";

export default function ReviewResultsPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(10); // rows per page
  const navigate = useNavigate();
  const { modal, openModal, closeModal } = useModal();

  // Fetch documents and extracted fields
  useEffect(() => {
    async function loadData() {
      try {
        const docsRes = await fetchDocuments();
        const docs = docsRes.documents;

        // API_BASE_URL is imported from config/api.js
        const token = localStorage.getItem('auth_token');
        const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
        
        const docsWithFields = await Promise.all(
          docs.map(async (doc) => {
            try {
              const fieldsRes = await fetch(
                `${API_BASE_URL}/documents/${doc.doc_id}/extracted-fields`,
                {
                  headers: {
                    ...authHeaders,
                    'Content-Type': 'application/json'
                  }
                }
              );
              if (!fieldsRes.ok) {
                throw new Error(`Failed to fetch fields: ${fieldsRes.statusText}`);
              }
              const fieldsData = await fieldsRes.json();
              const fields = fieldsData.fields || [];
              const nameField = fields.find(
                (f) => f.field_name === "patient_name"
              );

              return {
                ...doc,
                extracted_name: nameField?.value_raw || "-",
                confidence: nameField?.confidence || null,
              };
            } catch (err) {
              console.error("Error fetching fields for doc", doc.doc_id, err);
              return { ...doc, extracted_name: "-", confidence: null };
            }
          })
        );

        setResults(docsWithFields);
      } catch (error) {
        console.error("Failed to fetch review results:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Export all to Excel
  const handleExportAll = async () => {
    try {
      setExporting(true);
      // Export each document individually and combine
      // For MVP, we'll export the first completed document as an example
      // In production, you'd want a batch export endpoint
      if (results.length === 0) {
        await openModal({
          title: "No Documents",
          message: "No documents to export.",
          type: "warning",
          confirmText: "OK",
        });
        return;
      }
      
      const completedDoc = results.find(doc => doc.status === 'completed');
      if (!completedDoc) {
        await openModal({
          title: "No Completed Documents",
          message: "No completed documents to export.",
          type: "warning",
          confirmText: "OK",
        });
        return;
      }
      
      // API_BASE_URL is imported from config/api.js
      const token = localStorage.getItem('auth_token');
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      
      const res = await fetch(
        `${API_BASE_URL}/exports/${completedDoc.doc_id}`,
        {
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!res.ok) {
        throw new Error(`Export failed: ${res.statusText}`);
      }
      
      const exportData = await res.json();
      if (exportData.signed_url) {
        window.open(exportData.signed_url, '_blank');
      } else {
        alert("Export URL not available");
      }
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-600 text-lg">Loading...</p>
      </div>
    );

  // Pagination logic
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = results.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(results.length / rowsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900">
            Review Results
          </h1>
          <button
            onClick={handleExportAll}
            disabled={exporting}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {exporting ? "Exporting..." : "Export All to Excel"}
          </button>
        </div>

        <div className="overflow-x-auto bg-white shadow-lg rounded-lg w-full">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {[
                  "Doc ID",
                  "File Name",
                  "Extracted Name",
                  "Conf",
                  "Mismatch?",
                  "Processed At",
                  "Actions",
                ].map((col) => (
                  <th
                    key={col}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {currentRows.map((doc, index) => (
                <tr
                  key={doc.doc_id}
                  className={`${
                    index % 2 === 0 ? "bg-gray-50" : "bg-white"
                  } hover:bg-blue-50 transition`}
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-700">
                    {doc.doc_id}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {doc.filename}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {doc.extracted_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {doc.confidence !== null ? doc.confidence : "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {doc.mismatch ? "Yes" : "No"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {doc.created_at
                      ? new Date(doc.created_at).toLocaleString()
                      : "-"}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <button
                      onClick={() => navigate(`/document-review/${doc.doc_id}`)}
                      className="text-blue-600 hover:underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-4 space-x-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => paginate(page)}
                className={`px-4 py-2 rounded-md font-medium transition ${
                  currentPage === page
                    ? "bg-blue-600 text-white shadow"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onConfirm={modal.onConfirm}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
        showCancel={modal.showCancel}
        children={modal.children}
      />
    </div>
  );
}
