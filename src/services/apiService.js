import axios from "axios";

// Use environment variable for production, fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// Create axios instance with interceptor to add auth token
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 300000, // 5 minutes timeout for all requests
  maxContentLength: Infinity, // Allow large content length
  maxBodyLength: Infinity,    // Allow large body length
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, clear it and redirect to login
      localStorage.removeItem('auth_token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const uploadDocument = (file, uploader_id) => {
  const formData = new FormData();
  formData.append("file", file);
  // Note: uploader_id is not used in backend, but keeping for compatibility
  return api.post("/documents/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const uploadDataset = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/clients/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 300000, // 5 minutes timeout for large files (4300+ rows)
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
};

export const fetchDocuments = () => api.get("/documents/");
export const fetchDocumentDetails = (doc_id) => api.get(`/documents/${doc_id}`);
export const fetchExports = () => api.get("/exports/");
export const fetchExportById = (doc_id) => api.get(`/exports/${doc_id}`);
export const fetchStats = () => api.get("/stats/");
