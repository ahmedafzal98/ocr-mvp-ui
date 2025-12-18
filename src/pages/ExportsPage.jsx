import React, { useEffect, useState } from "react";
import axios from "axios";

export default function ExportsPage() {
  const [exportsList, setExportsList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchExports() {
      try {
        // Note: Backend doesn't have a list exports endpoint yet
        // For now, we'll fetch documents and their exports
        const docsRes = await axios.get("http://127.0.0.1:8000/documents/");
        const documents = docsRes.data.documents || [];
        
        // Fetch export for each completed document
        const exportsPromises = documents
          .filter(doc => doc.status === 'completed')
          .map(async (doc) => {
            try {
              const exportRes = await axios.get(`http://127.0.0.1:8000/exports/${doc.doc_id}`);
              return {
                export_id: exportRes.data.export_id,
                batch_or_doc: `Doc ${doc.doc_id}`,
                generated_at: exportRes.data.created_at,
                download_url: exportRes.data.signed_url
              };
            } catch (err) {
              return null;
            }
          });
        
        const exports = (await Promise.all(exportsPromises)).filter(e => e !== null);
        setExportsList(exports);
      } catch (err) {
        console.error("Failed to fetch exports:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchExports();
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div className="p-6">
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
  );
}
