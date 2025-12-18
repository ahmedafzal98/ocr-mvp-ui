import React, { useEffect, useState } from "react";
import ResultTable from "./ResultTable";
import axios from "axios";

function ResultsContainer() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        // 1. Fetch documents list
        const { data } = await axios.get("http://127.0.0.1:8000/documents/");
        const docs = data.documents;

        // 2. Fetch details for each document
        const allResults = await Promise.all(
          docs.map(async (doc) => {
            const res = await axios.get(
              `http://127.0.0.1:8000/documents/${doc.doc_id}`
            );

            // Transform fields into ResultTable format
            const fields = res.data.fields || [];
            let extractedName = "",
              nameConf = 1;
            let matchedClientId = "",
              matchScore = 1;
            let extractedDoB = "",
              dobMismatch = false;
            let extractedDoA = "",
              doaMismatch = false;
            let serviceDates = [],
              notes = res.data.notes || "Processed successfully";

            fields.forEach((f) => {
              if (f.field_name === "Patient_Name") {
                extractedName = f.value_norm;
                nameConf = f.match_score || 1;
                matchedClientId = f.matched_client_id || "";
                matchScore = f.match_score || 1;
              } else if (f.field_name === "Patient_DOB") {
                extractedDoB = f.value_norm;
                dobMismatch = f.decision !== "match";
              } else if (f.field_name === "Date_of_First_Visit") {
                extractedDoA = f.value_norm;
                doaMismatch = f.decision !== "match";
                serviceDates.push(f.value_norm);
              } else if (f.field_name === "Date_of_Last_Visit") {
                serviceDates.push(f.value_norm);
              }
            });

            return {
              docId: doc.doc_id,
              fileName: doc.filename,
              extractedName,
              nameConf,
              matchedClientId,
              matchScore,
              extractedDoB,
              dobMismatch,
              extractedDoA,
              doaMismatch,
              serviceDates,
              notes,
            };
          })
        );

        setResults(allResults);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  if (loading) return <p>Loading...</p>;
  return <ResultTable data={results} />;
}

export default ResultsContainer;
