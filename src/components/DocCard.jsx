import React from "react";

function getSeverityColor(isMismatch) {
  return isMismatch
    ? "bg-red-50 border-red-400 text-red-600"
    : "bg-green-50 border-green-400 text-green-600";
}

function DocCard({ doc }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
      <h3 className="text-lg font-semibold mb-1">{doc.fileName}</h3>
      <p className="text-gray-500 text-sm mb-3">Doc ID: {doc.docId}</p>

      <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
        <div>
          <p className="font-medium">Extracted Name</p>
          <div className="flex items-center justify-between">
            <span>{doc.extractedName}</span>
            <span className="text-gray-500 text-xs">
              {(doc.nameConf * 100).toFixed(0)}%
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full mt-1">
            <div
              className="h-2 rounded-full bg-blue-500"
              style={{ width: `${doc.nameConf * 100}%` }}
            ></div>
          </div>
        </div>

        <div>
          <p className="font-medium">Matched Client</p>
          <div className="flex items-center justify-between">
            <span>{doc.matchedClientId}</span>
            <span className="text-gray-500 text-xs">
              {(doc.matchScore * 100).toFixed(0)}%
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full mt-1">
            <div
              className="h-2 rounded-full bg-green-500"
              style={{ width: `${doc.matchScore * 100}%` }}
            ></div>
          </div>
        </div>

        <div
          className={`border-l-4 p-2 rounded ${getSeverityColor(
            doc.dobMismatch
          )}`}
        >
          <p className="font-medium text-xs">DoB</p>
          <p className="text-sm">{doc.extractedDoB}</p>
        </div>

        <div
          className={`border-l-4 p-2 rounded ${getSeverityColor(
            doc.doaMismatch
          )}`}
        >
          <p className="font-medium text-xs">DoA</p>
          <p className="text-sm">{doc.extractedDoA}</p>
        </div>
      </div>

      <div className="mb-2">
        <p className="font-medium text-sm mb-1">Service Dates</p>
        <p className="text-gray-700 text-sm">{doc.serviceDates.join(", ")}</p>
      </div>

      <p className="text-gray-500 text-sm mt-1">Notes: {doc.notes}</p>
    </div>
  );
}

export default DocCard;
