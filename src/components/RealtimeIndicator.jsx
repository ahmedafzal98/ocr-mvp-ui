import React, { useState, useEffect } from "react";

export default function RealtimeIndicator({ ws }) {
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    if (!ws) return;

    const checkStatus = () => {
      if (ws.readyState === WebSocket.OPEN) {
        setConnectionStatus("connected");
      } else if (ws.readyState === WebSocket.CONNECTING) {
        setConnectionStatus("connecting");
      } else {
        setConnectionStatus("disconnected");
      }
    };

    // Check status initially and periodically
    checkStatus();
    const interval = setInterval(checkStatus, 1000);

    // Note: We can't override onmessage here as it's set in Dashboard
    // Instead, we'll track updates via the status check

    return () => {
      clearInterval(interval);
    };
  }, [ws]);

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case "connected":
        return {
          bg: "bg-green-50",
          text: "text-green-700",
          dot: "bg-green-500",
          label: "Live Updates Active",
          pulse: true,
        };
      case "connecting":
        return {
          bg: "bg-yellow-50",
          text: "text-yellow-700",
          dot: "bg-yellow-500",
          label: "Connecting...",
          pulse: true,
        };
      default:
        return {
          bg: "bg-gray-50",
          text: "text-gray-600",
          dot: "bg-gray-400",
          label: "Disconnected",
          pulse: false,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`flex items-center space-x-2 ${config.bg} px-3 py-1.5 rounded-full`}>
      <div
        className={`w-2 h-2 ${config.dot} rounded-full ${
          config.pulse ? "animate-pulse" : ""
        }`}
      ></div>
      <span className={`text-sm font-medium ${config.text}`}>
        {config.label}
      </span>
      {connectionStatus === "connected" && (
        <span className={`text-xs ${config.text} opacity-75`}>
          • Real-time
        </span>
      )}
    </div>
  );
}

