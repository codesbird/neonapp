import React from "react";

export default function ProgressBar({ percent = 0 }) {
  return (
    <div className="w-full bg-[#111827] rounded h-6 overflow-hidden border border-[#0b1220]">
      <div
        className="h-full bg-gradient-to-r from-indigo-500 via-pink-500 to-yellow-400 transition-all"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
