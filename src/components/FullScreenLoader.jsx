import React from "react";

/**
 * FullScreenLoader - A modern, reusable full-screen loader component
 * 
 * Features:
 * - Blurred background overlay
 * - Centered animated spinner
 * - Customizable message
 * - Blocks UI interaction
 * 
 * @param {boolean} show - Whether to show the loader
 * @param {string} message - Message to display below spinner
 * @param {string} spinnerColor - Color of the spinner (default: blue-600)
 */
export default function FullScreenLoader({ 
  show = false, 
  message = "Loading...",
  spinnerColor = "blue"
}) {
  if (!show) return null;

  // Color mapping for spinner
  const colorMap = {
    blue: {
      border: "rgb(37, 99, 235)", // blue-600
      borderLight: "rgba(37, 99, 235, 0.2)",
      bg: "rgb(37, 99, 235)"
    },
    red: {
      border: "rgb(220, 38, 38)", // red-600
      borderLight: "rgba(220, 38, 38, 0.2)",
      bg: "rgb(220, 38, 38)"
    },
    green: {
      border: "rgb(22, 163, 74)", // green-600
      borderLight: "rgba(22, 163, 74, 0.2)",
      bg: "rgb(22, 163, 74)"
    }
  };

  const colors = colorMap[spinnerColor] || colorMap.blue;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Blurred background overlay */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      
      {/* Centered loader content */}
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4">
        {/* Animated spinner */}
        <div className="flex justify-center mb-6">
          <div className="relative w-16 h-16">
            {/* Outer spinning ring */}
            <div
              className="absolute inset-0 border-4 rounded-full"
              style={{ borderColor: colors.borderLight }}
            />
            {/* Inner spinning arc */}
            <div
              className="absolute inset-0 border-4 border-transparent rounded-full animate-spin"
              style={{
                borderTopColor: colors.border,
                animation: "spin 1s linear infinite",
              }}
            />
          </div>
        </div>

        {/* Loading message */}
        <div className="text-center">
          <p className="text-gray-700 text-lg font-medium">{message}</p>
          <p className="text-gray-500 text-sm mt-2">Please wait...</p>
        </div>

        {/* Pulsing dots animation */}
        <div className="flex justify-center gap-1 mt-4">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ 
              backgroundColor: colors.bg,
              animationDelay: "0s"
            }}
          />
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ 
              backgroundColor: colors.bg,
              animationDelay: "0.2s"
            }}
          />
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ 
              backgroundColor: colors.bg,
              animationDelay: "0.4s"
            }}
          />
        </div>
      </div>

      {/* Custom spinner animation */}
      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
