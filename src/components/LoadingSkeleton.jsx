import React from "react";

export default function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-16 h-16 bg-gray-200 rounded-xl"></div>
              <div className="text-right space-y-2">
                <div className="h-8 w-16 bg-gray-200 rounded"></div>
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
              </div>
            </div>
            <div className="h-2 bg-gray-200 rounded-full"></div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

