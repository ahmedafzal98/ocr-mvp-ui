import React, { useEffect, useState } from "react";
import { fetchDocuments } from "../services/documentService";
import { fetchExportById } from "../services/apiService";
import Navbar from "../components/Navbar";

export default function ExportsPage() {
  const [exportsList, setExportsList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchExports() {
      try {
        // Fetch documents using authenticated service
        const docsRes = await fetchDocuments();
        const documents = docsRes.documents || [];
        
        // Fetch export for each completed document
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
        const token = localStorage.getItem('auth_token');
        const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
        
        const exportsPromises = documents
          .filter(doc => doc.status === 'completed')
          .map(async (doc) => {
            try {
              const exportRes = await fetch(`${API_BASE_URL}/exports/${doc.doc_id}`, {
                headers: {
                  ...authHeaders,
                  'Content-Type': 'application/json'
                }
              });
              
              if (!exportRes.ok) {
                return null;
              }
              
              const exportData = await exportRes.json();
              return {
                export_id: exportData.export_id,
                batch_or_doc: `Doc ${doc.doc_id}`,
                generated_at: exportData.created_at,
                download_url: exportData.signed_url || exportData.file_content
              };
            } catch (err) {
              console.error(`Error fetching export for doc ${doc.doc_id}:`, err);
              return null;
            }
          });
        
        const exports = (await Promise.all(exportsPromises)).filter(e => e !== null);
        setExportsList(exports);
      } catch (err) {
        console.error("Failed to fetch exports:", err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          window.location.href = '/login';
        }
      } finally {
        setLoading(false);
      }
    }

    fetchExports();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center items-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Loading exports...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Exports</h1>

      <div className="overflow-x-auto bg-white shadow-md rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Export ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Batch/Doc
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Generated At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Download
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {exportsList.map((exp) => (
              <tr key={exp.export_id} className="hover:bg-blue-50 transition">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                  {exp.export_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {exp.batch_or_doc}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {exp.generated_at
                    ? new Date(exp.generated_at).toLocaleString()
                    : "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                  <a
                    href={exp.download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    Download
                  </a>
                </td>
              </tr>
            ))}
            {exportsList.length === 0 && (
              <tr>
                <td
                  colSpan="4"
                  className="px-6 py-4 text-center text-sm text-gray-500"
                >
                  No exports available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
}
