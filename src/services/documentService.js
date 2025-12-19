// src/services/documentService.js
import axios from "axios";

// Use environment variable for production, fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchDocuments = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/documents/`, {
      headers: getAuthHeaders()
    });
    // Backend returns { documents: [...] }
    return response.data;
  } catch (error) {
    console.error("Error fetching documents:", error);
    if (error.response?.status === 401) {
      // Redirect to login on 401
      window.location.href = '/login';
    }
    return { documents: [] };
  }
};

export const fetchDocumentById = async (docId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/documents/${docId}`, {
      headers: getAuthHeaders()
    });
    // API returns { document: {...} }
    return response.data.document;
  } catch (error) {
    console.error("Error fetching document:", error);
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }
    return null;
  }
};

export const fetchDocumentsWithFields = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/documents/`, {
      headers: getAuthHeaders()
    });
    return response.data.documents || [];
  } catch (error) {
    console.error("Error fetching documents with fields:", error);
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }
    return [];
  }
};

export const exportDocumentExcel = async (docId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/exports/${docId}`, {
      headers: getAuthHeaders()
    });
    // Backend returns { signed_url: "...", ... }
    return response.data.signed_url;
  } catch (error) {
    console.error("Error exporting document:", error);
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }
    return null;
  }
};
