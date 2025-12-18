import React, { useEffect, useState } from "react";

export default function BatchCard({ title, count, icon, bgColor }) {
  const [displayCount, setDisplayCount] = useState(count);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (displayCount !== count) {
      setIsUpdating(true);
      // Smooth transition to new count
      const timer = setTimeout(() => {
        setDisplayCount(count);
        setIsUpdating(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [count, displayCount]);
  const getGradient = () => {
    switch (title) {
      case "Total Uploaded":
        return "from-blue-500 to-blue-600";
      case "Processing":
        return "from-yellow-500 to-orange-500";
      case "Completed":
        return "from-green-500 to-emerald-600";
      case "Failed":
        return "from-red-500 to-rose-600";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  const getIconBg = () => {
    switch (title) {
      case "Total Uploaded":
        return "bg-blue-100";
      case "Processing":
        return "bg-yellow-100";
      case "Completed":
        return "bg-green-100";
      case "Failed":
        return "bg-red-100";
      default:
        return "bg-gray-100";
    }
  };

  return (
    <div className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
      {/* Gradient Background */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${getGradient()} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
      ></div>

      {/* Content */}
      <div className="relative p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`${getIconBg()} rounded-xl p-3 group-hover:scale-110 transition-transform duration-300`}>
            <span className="text-3xl">{icon}</span>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end space-x-2 mb-1">
              <p className={`text-4xl font-bold text-gray-800 transition-all duration-300 ${
                isUpdating ? 'scale-110 text-blue-600' : ''
              }`}>
                {displayCount}
              </p>
              {isUpdating && (
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              )}
            </div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${getGradient()} rounded-full transition-all duration-500`}
            style={{ width: `${Math.min((count / 100) * 100, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Shine Effect */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white to-transparent opacity-20"></div>
    </div>
  );
}
