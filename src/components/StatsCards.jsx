import React, { useEffect, useState } from "react";
import { fetchStats } from "../services/documentService";

function StatsCards() {
  const [stats, setStats] = useState({
    total_docs: 0,
    mismatches: 0,
    processed: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await fetchStats();
        setStats(data);
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const cards = [
    {
      title: "Total Documents",
      value: stats.total_docs,
      icon: "📄",
      color: "text-blue-600",
    },
    {
      title: "Mismatches",
      value: stats.mismatches,
      icon: "⚠️",
      color: "text-red-600",
    },
    {
      title: "Processed",
      value: stats.processed,
      icon: "✅",
      color: "text-green-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="bg-white shadow-lg rounded-xl p-6 flex items-center justify-between"
        >
          <div>
            <h3 className="text-gray-500">{card.title}</h3>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
          <div className={`text-4xl ${card.color}`}>{card.icon}</div>
        </div>
      ))}
    </div>
  );
}

export default StatsCards;
