// src/services/documentService.js
import axios from "axios";

// Use environment variable for production, fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export const fetchDocuments = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/documents/`);
    // Backend returns { documents: [...] }
    return response.data;
  } catch (error) {
    console.error("Error fetching documents:", error);
    return { documents: [] };
  }
};

export const fetchDocumentById = async (docId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/documents/${docId}`);
    // API returns { document: {...} }
    return response.data.document;
  } catch (error) {
    console.error("Error fetching document:", error);
    return null;
  }
};

export const fetchDocumentsWithFields = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/documents/`);
    return response.data.documents || [];
  } catch (error) {
    console.error("Error fetching documents with fields:", error);
    return [];
  }
};

export const exportDocumentExcel = async (docId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/exports/${docId}`);
    // Backend returns { signed_url: "...", ... }
    return response.data.signed_url;
  } catch (error) {
    console.error("Error exporting document:", error);
    return null;
  }
};
