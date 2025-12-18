import React, { useEffect, useState } from "react";
import DocCard from "./DocCard";
import axios from "axios";

function DocCardWrapper({ docId }) {
  const [doc, setDoc] = useState(null);

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const res = await axios.get(`http://127.0.0.1:8000/documents/${docId}`);
        const { fields } = res.data;

        // Map backend fields to DocCard props
        const getField = (name) =>
          fields.find((f) => f.field_name === name)?.value_norm || "";

        const getMismatch = (name) =>
          fields.find((f) => f.field_name === name)?.decision !== "match";

        const getMatchScore = (name) =>
          (fields.find((f) => f.field_name === name)?.match_score || 0) / 100;

        setDoc({
          fileName: `Document ${docId}`,
          docId: docId,
          extractedName: getField("Patient_Name"),
          nameConf: getMatchScore("Patient_Name"),
          matchedClientId: getField("Patient_ID"),
          matchScore: getMatchScore("Patient_ID"),
          extractedDoB: getField("Patient_DOB"),
          dobMismatch: getMismatch("Patient_DOB"),
          extractedDoA: getField("Date_of_First_Visit"),
          doaMismatch: getMismatch("Date_of_First_Visit"),
          serviceDates: [
            getField("Date_of_First_Visit"),
            getField("Date_of_Last_Visit"),
          ].filter(Boolean),
          notes: "Processed successfully",
        });
      } catch (err) {
        console.error("Failed to fetch document:", err);
      }
    };

    fetchDoc();
  }, [docId]);

  if (!doc) return <p>Loading...</p>;

  return <DocCard doc={doc} />;
}

export default DocCardWrapper;
