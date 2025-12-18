import React from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function ExportButton({ results }) {
  const handleExport = () => {
    if (!results || results.length === 0) return;

    // Prepare data for Excel
    const dataToExport = results.map((doc) => ({
      "Doc ID": doc.docId,
      "File Name": doc.fileName,
      "Extracted Name": doc.extractedName,
      "Name Confidence": (doc.nameConf * 100).toFixed(2) + "%",
      "Matched Client": doc.matchedClientId,
      "Match Score": (doc.matchScore * 100).toFixed(2) + "%",
      DoB: doc.extractedDoB,
      "DoB Mismatch": doc.dobMismatch ? "Yes" : "No",
      DoA: doc.extractedDoA,
      "DoA Mismatch": doc.doaMismatch ? "Yes" : "No",
      "Service Dates": doc.serviceDates.join(", "),
      Notes: doc.notes,
    }));

    // Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Documents");

    // Write workbook to binary and trigger download
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, "ocr_documents.xlsx");
  };

  return (
    <div className="mt-6 flex justify-end">
      <button
        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition font-semibold"
        onClick={handleExport}
      >
        Export Excel
      </button>
    </div>
  );
}

export default ExportButton;
