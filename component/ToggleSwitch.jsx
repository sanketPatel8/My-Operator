"use client";
import { useState } from "react";

export default function ToggleSwitch() {
  const [enabled, setEnabled] = useState(true);

  return (
    <label className="inline-flex items-center cursor-pointer relative">
      <input
        type="checkbox"
        className="sr-only"
        checked={enabled}
        onChange={() => setEnabled(!enabled)}
      />
      <div className={`w-[60px] h-[22px] rounded-full flex items-center justify-${enabled ? "end" : "start"} px-[4px] transition-colors duration-300 ${enabled ? "bg-[#8DC027]" : "bg-gray-300"}`}>
        <span className={`text-white text-sm font-medium transition-all duration-300 ${enabled ? "pr-[25px]" : "pl-[22px]"}`}>
          {enabled ? "On" : "Away"}
        </span>
        <div className="w-5 h-5 bg-white rounded-full shadow-md absolute left-[7px] top-[1px] transform transition-transform duration-300"
          style={{
            transform: enabled ? "translateX(32px)" : "translateX(-5px)",
          }}
        ></div>
      </div>
    </label>
  );
}
