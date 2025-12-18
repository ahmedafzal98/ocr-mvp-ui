import { useState, useEffect } from "react";
import { fetchDocumentsWithFields } from "../services/documentService";

export const useDocuments = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const docs = await fetchDocumentsWithFields();
      console.log(docs);

      //   setResults(docs);
    } catch (err) {
      console.error("Error loading documents:", err);
      setError("Failed to load documents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  return { results, loading, error, reload: loadDocuments, setResults };
};
