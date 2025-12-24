import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Modal from "../components/Modal";
import { useModal } from "../hooks/useModal";
import { API_BASE_URL } from "../config/api";

export default function DocumentReviewPage() {
  const { docId } = useParams();
  const navigate = useNavigate();
  const [fields, setFields] = useState([]);
  const [matchInfo, setMatchInfo] = useState(null);
  const [doc, setDoc] = useState(null); // renamed
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { modal, openModal, closeModal } = useModal();


  console.log("fields", fields);
  // Helper function to format dates to MM/DD/YYYY
  const formatDateToMMDDYYYY = (dateStr) => {
    if (!dateStr || dateStr === 'N/A' || dateStr === 'Not available') {
      return dateStr;
    }
    
    // If already in MM/DD/YYYY format, return as-is
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Try to parse and format the date
    try {
      // Handle YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-');
        return `${month}/${day}/${year}`;
      }
      
      // Try parsing as Date object
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
      }
    } catch (e) {
      // If parsing fails, return original string
    }
    
    return dateStr;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      
      if (!token) {
        console.error("No auth token found, redirecting to login");
        window.location.href = '/login';
        return;
      }

      try {
        // Fetch document details with auth
        const docRes = await fetch(`${API_BASE_URL}/documents/${docId}`, {
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json'
          }
        });

        if (!docRes.ok) {
          if (docRes.status === 401 || docRes.status === 403) {
            console.error("Authentication failed, redirecting to login");
            window.location.href = '/login';
            return;
          }
          throw new Error(`Failed to fetch document: ${docRes.status} ${docRes.statusText}`);
        }

        const docData = await docRes.json();
        if (docData.document) {
          setDoc({ ...docData.document, doc_id: docData.document.doc_id || docId });
        } else {
          throw new Error("Document data not found in response");
        }

        // Fetch extracted fields with auth
        const fieldsRes = await fetch(`${API_BASE_URL}/documents/${docId}/extracted-fields`, {
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json'
          }
        });
        if (fieldsRes.ok) {
          const fieldsData = await fieldsRes.json();
          setFields(fieldsData.fields || []);
        } else if (fieldsRes.status === 401 || fieldsRes.status === 403) {
          console.warn("Failed to fetch fields: authentication error");
        }

        // Fetch match info with auth
        const matchRes = await fetch(`${API_BASE_URL}/matches/${docId}`, {
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json'
          }
        });
        if (matchRes.ok) {
          const matchData = await matchRes.json();
          setMatchInfo(matchData || null);
        } else if (matchRes.status === 401 || matchRes.status === 403) {
          console.warn("Failed to fetch match info: authentication error");
        }
      } catch (error) {
        console.error("Error fetching document data:", error);
        await openModal({
          title: "Error Loading Document",
          message: error.message || "Failed to load document. Please try again.",
          type: "error",
          confirmText: "OK",
        });
        // Don't set doc to null here, let the error message show
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [docId]);

  const handleExport = async () => {
    if (!doc) return;

    setExporting(true);
    try {
      // Use apiService which includes auth headers
      // API_BASE_URL is imported from config/api.js
      const token = localStorage.getItem('auth_token');
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      
      // First, try to get the export (might be direct download or signed URL)
      const response = await fetch(
        `${API_BASE_URL}/exports/${doc.doc_id || doc.id}`,
        {
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }
      
      // Check content type
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        // JSON response (signed URL or base64)
        const text = await response.text();
        const jsonData = JSON.parse(text);
        
        if (jsonData.signed_url) {
          // Open signed URL
          window.open(jsonData.signed_url, '_blank');
        } else if (jsonData.file_content) {
          // Decode base64 and download
          const binaryString = atob(jsonData.file_content);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
          });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = jsonData.filename || `report_${doc.doc_id || doc.id}.xlsx`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } else {
          await openModal({
            title: "Export Unavailable",
            message: "Export URL not available. Please try again.",
            type: "warning",
            confirmText: "OK",
          });
        }
      } else {
        // Direct blob download (Excel file)
        const blob = await response.blob();
        const filename = `report_${doc.doc_id || doc.id}_${new Date().toISOString().split('T')[0]}.xlsx`;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error exporting document:", error);
      const errorMessage = error.response?.data?.detail || error.message || "Export failed. Please try again.";
      await openModal({
        title: "Export Failed",
        message: errorMessage,
        type: "error",
        confirmText: "OK",
      });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 text-lg">Loading document...</p>
        </div>
      </div>
    );
  }
  
  if (!doc) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="bg-white shadow rounded p-6 text-center">
            <p className="text-red-500 text-lg mb-4">Document not found.</p>
            <button
              onClick={() => navigate("/")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500">
          <span
            className="hover:underline cursor-pointer"
            onClick={() => navigate("/")}
          >
            Dashboard
          </span>{" "}
          &gt;{" "}
          <span
            className="hover:underline cursor-pointer"
            onClick={() => navigate("/documents")}
          >
            Review Results
          </span>{" "}
          &gt; <span className="font-medium text-gray-700">{doc.filename}</span>
        </nav>

        {/* Document Summary */}
        <div className="bg-white shadow rounded p-5 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">{doc.filename}</h2>
            <p className="text-gray-500 text-sm">
              Uploaded at: {new Date(doc.created_at).toLocaleString()}
            </p>
          </div>

          <div className="space-x-2">
            <button
              onClick={() => navigate("/")}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded shadow"
            >
              Back to Dashboard
            </button>

            <button
              onClick={handleExport}
              disabled={exporting}
              className={`px-4 py-2 rounded shadow text-white ${
                exporting
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {exporting ? "Exporting..." : "Export to Excel"}
            </button>
          </div>
        </div>

        {/* Extracted Fields */}
        <div className="bg-white shadow rounded p-5">
          <h3 className="text-xl font-semibold mb-4">Extracted Fields</h3>
          {fields.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields
                .filter((field) => {
                  // Only show: Patient Name, Date of Birth, Date of Accident
                  const fieldName = field.field_name?.toLowerCase() || '';
                  return (
                    fieldName.includes('patient') ||
                    fieldName.includes('name') ||
                    fieldName === 'dob' ||
                    fieldName === 'date of birth' ||
                    fieldName === 'doa' ||
                    fieldName === 'date of accident'
                  );
                })
                .map((field, idx) => (
                <div
                  key={idx}
                  className="p-4 border rounded bg-gray-50 hover:bg-gray-100 transition"
                >
                  <p className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-2">
                    {field.field_name}
                  </p>
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-semibold text-gray-900 text-lg">
                      {/* Format dates to MM/DD/YYYY */}
                      {(field.field_name?.toLowerCase().includes('date') || 
                        field.field_name === 'Date of Birth' || 
                        field.field_name === 'Date of Accident' ||
                        field.field_name?.toLowerCase() === 'dob' ||
                        field.field_name?.toLowerCase() === 'doa')
                        ? formatDateToMMDDYYYY(field.value_raw || "-")
                        : field.value_raw || "-"}
                    </p>
                    {field.page_num && (
                      <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded ml-2">
                        📄 Page {field.page_num}
                      </span>
                    )}
                  </div>
                  {field.value_norm && field.value_norm !== field.value_raw && (
                    <p className="text-sm text-gray-500 mb-1">
                      Normalized: {
                        (field.field_name?.toLowerCase().includes('date') || 
                         field.field_name === 'Date of Birth' || 
                         field.field_name === 'Date of Accident' ||
                         field.field_name?.toLowerCase() === 'dob' ||
                         field.field_name?.toLowerCase() === 'doa')
                        ? formatDateToMMDDYYYY(field.value_norm)
                        : field.value_norm
                      }
                    </p>
                  )}
                  {field.confidence !== null && (
                    <p className="text-xs text-gray-400">
                      Confidence: {(field.confidence * 100).toFixed(0)}%
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">No extracted fields available.</p>
              <p className="text-sm text-gray-400">
                {doc.status === 'processing' 
                  ? 'Fields are being extracted...' 
                  : doc.status === 'pending'
                  ? 'Document is queued for processing...'
                  : 'Document processing may have failed. Please check the document status.'}
              </p>
            </div>
          )}
        </div>

        {/* Mismatches Summary */}
        {matchInfo && matchInfo.mismatches && matchInfo.mismatches.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 shadow rounded p-5">
            <h3 className="text-xl font-semibold mb-4 text-red-700">
              ⚠️ Mismatches Detected
            </h3>
            <div className="space-y-3">
              {matchInfo.mismatches.map((mismatch, idx) => (
                <div key={idx} className="bg-white rounded p-4 border border-red-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 capitalize mb-1">
                        {mismatch.field === 'dob' ? 'Date of Birth' : mismatch.field === 'doa' ? 'Date of Accident' : mismatch.field}
                      </p>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Expected Value</p>
                          <p className="text-sm font-medium text-gray-700">
                            {formatDateToMMDDYYYY(mismatch.expected_value || 'N/A')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Observed Value</p>
                          <p className="text-sm font-medium text-red-700">
                            {formatDateToMMDDYYYY(mismatch.observed_value || 'N/A')}
                          </p>
                        </div>
                      </div>
                    </div>
                    {mismatch.page_number && (
                      <div className="ml-4 bg-red-100 px-3 py-1 rounded">
                        <p className="text-xs font-semibold text-red-700">
                          Page {mismatch.page_number}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Match Info */}
        <div className="bg-white shadow rounded p-5">
          <h3 className="text-xl font-semibold mb-4">Match Information</h3>

          {matchInfo ? (
            <div className="space-y-6">
              {/* Overall Match Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Matched Client */}
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Matched Client</p>
                    <p className="font-semibold text-gray-900 text-lg">
                      {matchInfo.client_name || `Client ID: ${matchInfo.client_id}` || "—"}
                    </p>
                    {matchInfo.client_id && (
                      <p className="text-xs text-gray-500 mt-1">ID: {matchInfo.client_id}</p>
                    )}
                  </div>

                  {/* Match Score */}
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Match Score</p>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-lg">
                        {matchInfo.score != null ? `${matchInfo.score.toFixed(1)}%` : "—"}
                      </p>
                      {matchInfo.score != null && (
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-24">
                          <div
                            className={`h-2 rounded-full ${
                              matchInfo.score >= 90
                                ? "bg-green-500"
                                : matchInfo.score >= 70
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${Math.min(matchInfo.score, 100)}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Decision */}
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Overall Status</p>
                    {matchInfo.decision === "match" ? (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">✅</span>
                        <p className="font-semibold text-green-600 text-lg">Matched</p>
                      </div>
                    ) : matchInfo.decision === "ambiguous" ? (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">⚠️</span>
                        <p className="font-semibold text-yellow-600 text-lg">Ambiguous</p>
                      </div>
                    ) : matchInfo.decision === "No match found yet" ? (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">⏳</span>
                        <p className="font-semibold text-gray-600 text-lg">No Match Yet</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">❌</span>
                        <p className="font-semibold text-red-600 text-lg">
                          {matchInfo.decision === "no_match" ? "No Match" : matchInfo.decision ?? "Error"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Field-by-Field Matching */}
              {matchInfo.field_matches && Object.keys(matchInfo.field_matches).length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-gray-700">
                    Field-by-Field Matching
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(matchInfo.field_matches)
                      .filter(([fieldKey, fieldData]) => {
                        // Only show: patient_name, dob, doa (exclude referral)
                        return ['patient_name', 'dob', 'doa'].includes(fieldKey);
                      })
                      .map(([fieldKey, fieldData]) => {
                      const getStatusIcon = () => {
                        if (fieldData.is_match === true) return "✅";
                        if (fieldData.is_match === false) return "❌";
                        if (fieldData.match_status === "not_in_dataset") return "ℹ️";
                        if (fieldData.match_status === "not_applicable") return "—";
                        return "⏳";
                      };

                      const getStatusColor = () => {
                        if (fieldData.is_match === true) return "border-green-500 bg-green-50";
                        if (fieldData.is_match === false) return "border-red-500 bg-red-50";
                        if (fieldData.match_status === "not_in_dataset") return "border-blue-500 bg-blue-50";
                        if (fieldData.match_status === "not_applicable") return "border-gray-300 bg-gray-50";
                        return "border-yellow-500 bg-yellow-50";
                      };

                      const getStatusText = () => {
                        if (fieldData.is_match === true) return "Matched";
                        if (fieldData.is_match === false) return "Mismatch";
                        if (fieldData.match_status === "not_in_dataset") return "Not in Dataset";
                        if (fieldData.match_status === "not_applicable") return "N/A";
                        return "Not Checked";
                      };

                      return (
                        <div
                          key={fieldKey}
                          className={`border-l-4 rounded-lg p-4 ${getStatusColor()} transition hover:shadow-md`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{getStatusIcon()}</span>
                              <div>
                                <h5 className="font-semibold text-gray-900">
                                  {fieldData.display_name}
                                </h5>
                                <p className={`text-sm font-medium ${
                                  fieldData.is_match === true
                                    ? "text-green-700"
                                    : fieldData.is_match === false
                                    ? "text-red-700"
                                    : "text-gray-600"
                                }`}>
                                  {getStatusText()}
                                </p>
                              </div>
                            </div>
                            {fieldData.confidence != null && (
                              <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                                Confidence: {(fieldData.confidence * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                            {/* Extracted Value */}
                            <div className="bg-white rounded p-3 border border-gray-200">
                              <div className="flex items-start justify-between mb-1">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                  Extracted from Document
                                </p>
                                {fieldData.page_number && (
                                  <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded">
                                    📄 Page {fieldData.page_number}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-semibold text-gray-900">
                                {/* Format date if it's a date field */}
                                {(fieldKey === 'dob' || fieldKey === 'doa') 
                                  ? formatDateToMMDDYYYY(fieldData.extracted_value) 
                                  : fieldData.extracted_value || "—"}
                              </p>
                            </div>

                            {/* Expected Value */}
                            <div className="bg-white rounded p-3 border border-gray-200">
                              <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                                Expected from Dataset
                              </p>
                              <p className={`text-sm font-semibold ${
                                fieldData.is_match === false
                                  ? "text-red-700"
                                  : fieldData.is_match === true
                                  ? "text-green-700"
                                  : "text-gray-600"
                              }`}>
                                {/* Format date if it's a date field */}
                                {(fieldKey === 'dob' || fieldKey === 'doa') 
                                  ? formatDateToMMDDYYYY(fieldData.expected_value || "Not available")
                                  : fieldData.expected_value || "Not available"}
                              </p>
                            </div>
                          </div>

                          {/* Mismatch Details */}
                          {fieldData.is_match === false && (
                            <div className="mt-3 p-2 bg-red-100 rounded border border-red-300">
                              <p className="text-xs text-red-700 font-medium">
                                ⚠️ Mismatch detected: The extracted value does not match the expected value from the dataset.
                                {fieldData.page_number && (
                                  <span className="ml-2 font-semibold">
                                    (Found on page {fieldData.page_number})
                                  </span>
                                )}
                              </p>
                            </div>
                          )}

                          {/* Not in Dataset Info */}
                          {fieldData.match_status === "not_in_dataset" && (
                            <div className="mt-3 p-2 bg-blue-100 rounded border border-blue-300">
                              <p className="text-xs text-blue-700">
                                ℹ️ This field was extracted from the document but is not present in the client dataset for comparison.
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">No match information available.</p>
              <p className="text-sm text-gray-400">
                The document may still be processing or no client match was found.
              </p>
            </div>
          )}
        </div>
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
