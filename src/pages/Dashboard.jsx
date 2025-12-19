// DocumentsPage.jsx
import React, { useEffect, useState, useRef,useMemo } from "react";
import Navbar from "../components/Navbar";
import BatchCard from "../components/BatchCard";
import UploadButton from "../components/UploadButton";
import DocumentsTable from "../components/DocumentsTable";
import Modal from "../components/Modal";
import LoadingSkeleton from "../components/LoadingSkeleton";
import RealtimeIndicator from "../components/RealtimeIndicator";
import { fetchDocuments } from "../services/documentService";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useModal } from "../hooks/useModal";
import { useAuth } from "../contexts/AuthContext";

export default function DocumentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [uploadingDataset, setUploadingDataset] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const excelInputRef = useRef(null);
  const ws = useRef(null);
  const { modal, openModal, closeModal, showConfirm } = useModal();
  const { getAuthHeaders } = useAuth();
  
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

  // --- Helper to calculate batch counts dynamically ---
  const getBatchCounts = (docs) => {
    return {
      total: docs.length,
      processing: docs.filter(
        (d) => d.status === "uploaded" || d.status === "processing"
      ).length,
      completed: docs.filter((d) => d.status === "completed").length,
      failed: docs.filter((d) => d.status === "error" || d.status === "failed")
        .length,
    };
  };

  // Recalculate counts whenever documents change (for real-time updates)
  const counts = useMemo(() => getBatchCounts(documents), [documents]);

  const batchData = [
    {
      title: "Total Uploaded",
      count: counts.total,
      icon: "📄",
      bgColor: "bg-blue-50",
    },
    {
      title: "Processing",
      count: counts.processing,
      icon: "⏳",
      bgColor: "bg-yellow-50",
    },
    {
      title: "Completed",
      count: counts.completed,
      icon: "✅",
      bgColor: "bg-green-50",
    },
    {
      title: "Failed",
      count: counts.failed,
      icon: "⚠️",
      bgColor: "bg-red-50",
    },
  ];

  useEffect(() => {
    let mounted = true;

    const getDocuments = async () => {
      if (!mounted) return;
      setLoading(true);
      try {
        const response = await fetchDocuments();
        const docs = response.documents || [];
        if (!mounted) return;
        setDocuments(docs);
        console.log(`📋 Loaded ${docs.length} documents`);
      } catch (err) {
        console.error("Failed to fetch documents:", err);
        // Set empty array on error to prevent UI issues
        if (mounted) {
          setDocuments([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    getDocuments();
    
    // Refresh when component becomes visible (e.g., navigating back from upload page)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && mounted) {
        console.log("🔄 Page visible, refreshing documents...");
        getDocuments();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also refresh when window gains focus
    const handleFocus = () => {
      if (mounted) {
        console.log("🔄 Window focused, refreshing documents...");
        getDocuments();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    
    // Refresh documents every 30 seconds as fallback (in case WebSocket misses updates)
    const refreshInterval = setInterval(() => {
      if (mounted) {
        console.log("🔄 Periodic refresh of documents list");
        getDocuments();
      }
    }, 30000);

    // --- WebSocket for real-time status updates ---
    const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 
      (window.location.protocol === "https:" ? "wss" : "ws") + "://127.0.0.1:8000";
    const token = localStorage.getItem('auth_token');
    const WS_URL = token ? `${WS_BASE_URL}/ws/status?token=${encodeURIComponent(token)}` : `${WS_BASE_URL}/ws/status`;
    
    let reconnectTimeout = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    
    const connectWebSocket = () => {
      try {
        ws.current = new WebSocket(WS_URL);

        ws.current.onopen = () => {
          console.log("✅ WebSocket connected for real-time updates");
          reconnectAttempts = 0;
        };

        const statusMap = {
          pending: "uploaded",
          uploaded: "uploaded",
          processing: "processing",
          processing_finished: "processing",
          completed: "completed",
          error: "error",
          failed: "error",
        };

        // Normalize status function
        const normalizeStatus = (status) => {
          if (!status) return null;
          const lowerStatus = String(status).toLowerCase().trim();
          return statusMap[lowerStatus] || lowerStatus;
        };

        ws.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("📨 WebSocket message received:", data);
            
            // Handle both 'status' and 'message' fields
            const statusFromData = data.status || data.message;
            const newStatus = normalizeStatus(statusFromData) || statusFromData;
            
            console.log(`📊 Status mapping: "${statusFromData}" → "${newStatus}"`);

            if (data.doc_id) {
              console.log(`🔄 Updating document ${data.doc_id} status: ${newStatus}`);
              
              setDocuments((prev) => {
                const docIndex = prev.findIndex(d => d.doc_id === data.doc_id);
                
                if (docIndex === -1) {
                  console.warn(`⚠️ Document ${data.doc_id} not found in current list, refreshing...`);
                  // If document not in list, refresh the list
                  setTimeout(() => {
                    if (mounted) {
                      getDocuments();
                    }
                  }, 1000);
                  return prev;
                }
                
                const oldDoc = prev[docIndex];
                const updated = [...prev];
                updated[docIndex] = {
                  ...oldDoc,
                  status: newStatus,
                  updated_at: new Date().toISOString()
                };
                
                // Log the update for debugging
                console.log(`✅ Document ${data.doc_id} status updated:`, {
                  filename: oldDoc.filename,
                  oldStatus: oldDoc.status,
                  newStatus: newStatus
                });
                
                return updated;
              });
            } else {
              console.warn("⚠️ WebSocket message missing doc_id:", data);
            }
          } catch (err) {
            console.error("❌ Invalid WS message:", event.data, err);
          }
        };

        ws.current.onerror = (error) => {
          console.error("WebSocket error:", error);
        };

        ws.current.onclose = () => {
          console.log("WebSocket disconnected");
          // Attempt to reconnect
          if (mounted && reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            reconnectTimeout = setTimeout(() => {
              console.log(`Reconnecting WebSocket... (${reconnectAttempts}/${maxReconnectAttempts})`);
              connectWebSocket();
            }, 3000 * reconnectAttempts);
          }
        };
      } catch (error) {
        console.error("Failed to create WebSocket:", error);
      }
    };

    connectWebSocket();

    return () => {
      mounted = false;
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws.current) {
        if (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING) {
          ws.current.close();
        }
      }
    };
  }, []); // Empty dependency array - WebSocket connection is established once
  
  // Refresh documents when navigating back to this page
  useEffect(() => {
    if (location.pathname === '/') {
      console.log("🔄 Dashboard page active, refreshing documents...");
      const getDocuments = async () => {
        try {
          const response = await fetchDocuments();
          setDocuments(response.documents || []);
        } catch (err) {
          console.error("Failed to fetch documents:", err);
        }
      };
      // Small delay to ensure page is fully loaded
      setTimeout(getDocuments, 500);
    }
  }, [location.pathname]);

  // --- Upload Handlers ---
  const handleUploadClick = () => navigate("/upload-document");
  const handleExcelUploadClick = () => excelInputRef.current.click();

  const handleExcelFileSelected = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingDataset(true);
    setUploadResult(null);
    setUploadError(null);

    try {
      // Use the apiService which has proper timeout settings
      const apiService = await import("../services/apiService");
      const res = await apiService.uploadDataset(file);

      setUploadResult({
        message: res.data.message,
        rows_inserted: res.data.inserted,
        total_rows: res.data.total_rows,
        skipped: res.data.skipped
      });

      // Refresh documents list after upload
      const response = await fetchDocuments();
      setDocuments(response.documents || []);
    } catch (err) {
      // Show actual error message from backend
      const errorMessage = err.response?.data?.detail || err.message || "Failed to upload dataset. Please try again.";
      setUploadError(errorMessage);
      console.error("Dataset upload error:", err.response?.data || err);
    } finally {
      setUploadingDataset(false);
      e.target.value = "";
    }
  };

  const handleDeleteAllDocuments = async () => {
    // Show confirmation modal
    const confirmed = await showConfirm({
      title: "⚠️ Delete All Documents",
      message:
        "This will delete ALL documents, extracted fields, matches, and exports.\n\n" +
        "The client dataset will NOT be deleted.\n\n" +
        "Are you sure you want to continue?",
      confirmText: "Delete All",
      cancelText: "Cancel",
    });

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    try {
      const response = await axios.delete(`${API_BASE_URL}/documents/all`, {
        headers: getAuthHeaders()
      });
      
      // Show success message
      await openModal({
        title: "✅ Successfully Deleted",
        message:
          `All documents have been deleted successfully!\n\n` +
          `Documents: ${response.data.deleted.documents}\n` +
          `Extracted Fields: ${response.data.deleted.extracted_fields}\n` +
          `Matches: ${response.data.deleted.matches}\n` +
          `Mismatches: ${response.data.deleted.mismatches}\n` +
          `Exports: ${response.data.deleted.exports}\n\n` +
          `Note: Client dataset was NOT deleted.`,
        type: "success",
        confirmText: "OK",
      });

      // Refresh documents list
      const response2 = await fetchDocuments();
      setDocuments(response2.documents || []);
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.message || "Failed to delete documents";
      setDeleteError(errorMessage);
      await openModal({
        title: "❌ Delete Failed",
        message: errorMessage,
        type: "error",
        confirmText: "OK",
      });
      console.error("Error deleting documents:", error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8 animate-slideDown">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Document Processing Dashboard
          </h1>
          <p className="text-gray-600">
            Monitor and manage your medical billing documents in real-time
          </p>
        </div>

        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 animate-slideUp">
          <button
            onClick={handleDeleteAllDocuments}
            disabled={deleting || documents.length === 0}
            className={`inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 ${
              deleting || documents.length === 0
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg transform hover:scale-105"
            }`}
            title={documents.length === 0 ? "No documents to delete" : "Delete all documents and related data"}
          >
            {deleting ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete All</span>
              </>
            )}
          </button>
          
          <div className="flex flex-wrap gap-3">
            <UploadButton
              text="Upload Dataset"
              primary={false}
              onClick={handleExcelUploadClick}
            />
            <UploadButton
              text="Upload Document"
              onClick={handleUploadClick}
            />
          </div>
        </div>

        {/* Delete Error */}
        {deleteError && (
          <div className="mb-6 p-5 bg-red-50 border border-red-200 rounded shadow">
            <h3 className="text-red-700 font-semibold text-lg">
              ❌ Delete Failed
            </h3>
            <p className="text-red-600 mt-2">{deleteError}</p>
          </div>
        )}

        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          ref={excelInputRef}
          className="hidden"
          onChange={handleExcelFileSelected}
        />

        {/* Upload Status Messages */}
        {uploadingDataset && (
          <div className="mb-6 p-4 bg-white rounded-xl shadow-lg border-l-4 border-blue-500 animate-slideDown flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
            <div>
              <p className="text-blue-700 font-semibold">Uploading dataset...</p>
              <p className="text-blue-600 text-sm">Please wait while we process your file</p>
            </div>
          </div>
        )}

        {uploadResult && (
          <div className="mb-6 p-5 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-xl shadow-lg animate-slideDown">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-green-800 font-bold text-lg mb-1">
                  Dataset Uploaded Successfully
                </h3>
                <div className="space-y-1 text-green-700">
                  <p><strong>Rows Inserted:</strong> {uploadResult.rows_inserted}</p>
                  {uploadResult.total_rows && (
                    <p><strong>Total Rows:</strong> {uploadResult.total_rows}</p>
                  )}
                  {uploadResult.skipped > 0 && (
                    <p><strong>Skipped:</strong> {uploadResult.skipped}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {uploadError && (
          <div className="mb-6 p-5 bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-500 rounded-xl shadow-lg animate-slideDown">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-red-800 font-bold text-lg mb-1">
                  Upload Failed
                </h3>
                <p className="text-red-700">{uploadError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {batchData.map((card, idx) => (
            <div key={idx} className="animate-slideUp" style={{ animationDelay: `${idx * 0.1}s` }}>
              <BatchCard
                title={card.title}
                count={card.count}
                icon={card.icon}
                bgColor={card.bgColor}
              />
            </div>
          ))}
        </div>

        {/* Documents Section */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 animate-slideUp">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Recent Documents</h2>
              <p className="text-gray-600 text-sm mt-1">
                {documents.length} {documents.length === 1 ? 'document' : 'documents'} total
              </p>
            </div>
            {!loading && <RealtimeIndicator ws={ws.current} />}
          </div>
          
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <DocumentsTable documents={documents} />
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
