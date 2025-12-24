// src/services/documentService.js
import axios from "axios";
import { API_BASE_URL } from "../config/api";

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

