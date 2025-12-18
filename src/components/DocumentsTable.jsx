import React, { useState } from "react";
import StatusBadge from "./StatusBadge";
import { useNavigate } from "react-router-dom";

export default function DocumentsTable({ documents, showAllLink = true }) {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState("all");
  const [hoveredRow, setHoveredRow] = useState(null);

  const filteredDocs = documents.filter((doc) =>
    filterStatus === "all" ? true : doc.status === filterStatus
  );

  const limitedDocs = filteredDocs.slice(0, 10);

  const handleRowClick = (docId) => {
    navigate(`/document-review/${docId}`);
  };

  const statusFilters = [
    { value: "all", label: "All", count: documents.length },
    {
      value: "uploaded",
      label: "Uploaded",
      count: documents.filter((d) => d.status === "uploaded").length,
    },
    {
      value: "processing",
      label: "Processing",
      count: documents.filter((d) => d.status === "processing").length,
    },
    {
      value: "completed",
      label: "Completed",
      count: documents.filter((d) => d.status === "completed").length,
    },
    {
      value: "error",
      label: "Failed",
      count: documents.filter((d) => d.status === "error" || d.status === "failed").length,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Status Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setFilterStatus(filter.value)}
            className={`group relative px-4 py-2 rounded-full font-medium text-sm transition-all duration-200 ${
              filterStatus === filter.value
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105"
                : "bg-white text-gray-700 hover:bg-gray-100 shadow-sm hover:shadow-md"
            }`}
          >
            <span className="flex items-center space-x-2">
              <span>{filter.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  filterStatus === filter.value
                    ? "bg-white bg-opacity-20"
                    : "bg-gray-200"
                }`}
              >
                {filter.count}
              </span>
            </span>
          </button>
        ))}
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  File Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Uploaded At
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Processed At
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {limitedDocs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <svg
                        className="w-12 h-12 text-gray-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p className="text-sm font-medium">No documents found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                limitedDocs.map((doc, index) => {
                  // Check if this document was recently updated (for animation)
                  const isProcessing = doc.status === 'processing';
                  
                  return (
                    <tr
                      key={doc.doc_id}
                      onMouseEnter={() => setHoveredRow(doc.doc_id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      className={`transition-all duration-300 cursor-pointer ${
                        hoveredRow === doc.doc_id
                          ? "bg-blue-50 transform scale-[1.01]"
                          : "hover:bg-gray-50"
                      } ${
                        isProcessing ? "bg-yellow-50 bg-opacity-50" : ""
                      }`}
                      onClick={() => handleRowClick(doc.doc_id)}
                    >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center">
                            <svg
                              className="w-6 h-6 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {doc.filename}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {doc.doc_id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <StatusBadge status={doc.status} />
                        {isProcessing && (
                          <div className="flex items-center space-x-1 text-xs text-yellow-600">
                            <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></div>
                            <span>Updating...</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(doc.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {doc.completed_at
                        ? new Date(doc.completed_at).toLocaleString()
                        : "-"}
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick(doc.doc_id);
                      }}
                    >
                      <button className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 font-medium transition-colors">
                        <span>View</span>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Show All Button */}
      {showAllLink && filteredDocs.length > 10 && (
        <div className="flex justify-end">
          <button
            onClick={() => navigate("/review-results")}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            <span>Show All Documents</span>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
