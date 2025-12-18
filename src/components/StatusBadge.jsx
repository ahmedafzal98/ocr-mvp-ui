import React from "react";

const statusConfig = {
  uploaded: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    border: "border-blue-300",
    icon: "📤",
    pulse: false,
  },
  processing: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    border: "border-yellow-300",
    icon: "⏳",
    pulse: true,
  },
  completed: {
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-300",
    icon: "✅",
    pulse: false,
  },
  error: {
    bg: "bg-red-100",
    text: "text-red-800",
    border: "border-red-300",
    icon: "❌",
    pulse: false,
  },
  failed: {
    bg: "bg-red-100",
    text: "text-red-800",
    border: "border-red-300",
    icon: "⚠️",
    pulse: false,
  },
};

export default function StatusBadge({ status }) {
  const normalizedStatus = status?.toLowerCase() || "unknown";
  const config = statusConfig[normalizedStatus] || {
    bg: "bg-gray-100",
    text: "text-gray-800",
    border: "border-gray-300",
    icon: "❓",
    pulse: false,
  };

  const displayText =
    normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);

  return (
    <span
      className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border} ${
        config.pulse ? "animate-pulse" : ""
      } transition-all duration-200`}
    >
      <span>{config.icon}</span>
      <span>{displayText}</span>
    </span>
  );
}
