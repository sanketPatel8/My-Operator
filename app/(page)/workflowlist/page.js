"use client";
import DashboardHeaader from "@/component/DashboardHeaader";
import Sidebar from "../sidebar/page";
import { useState } from "react";

export default function WorkflowList() {
  const [activeTab, setActiveTab] = useState("/workflowlist");
  const workflows = [
    { name: "Reminder 1", delay: "1 hour" },
    { name: "Reminder 2", delay: "4 hours" },
    { name: "Reminder 3", delay: "4 hours" },
  ];

  return (
    <div className="font-source-sans flex flex-col min-h-screen">
      {/* Header */}
      <DashboardHeaader />
 
      {/* Main layout wrapper */}
      <div className="p-[16px] flex flex-1 bg-[#E9E9E9]">
        {/* Sidebar */}
        <Sidebar active={activeTab} onChange={setActiveTab} />
 
        {/* Main Content */}
        <main className="flex-1 bg-white border-l border-[#E9E9E9]">
          <div className="py-[14px] pl-[32px] border-b border-[#E9E9E9]">
            <h2 className="text-[18px] font-semibold text-[#1A1A1A]">
              Workflow
            </h2>
            <p className="text-[14px] text-[#999999]">
              Manage your workflow settings.
            </p>
          </div>
 
          <div className="max-w-[757px]">
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Abandoned Cart Recovery</h2>
      <ul className="space-y-4">
        {workflows.map((flow, idx) => (
          <li
            key={idx}
            className="p-4 bg-white border rounded flex flex-col sm:flex-row items-start sm:items-center justify-between"
          >
            <div>
              <h4 className="font-medium">{flow.name}</h4>
              <p className="text-sm text-gray-500">Send after {flow.delay}</p>
            </div>
            <input type="checkbox" className="toggle toggle-primary mt-2 sm:mt-0" />
          </li>
        ))}
      </ul>
    </div>
    </div>
        </main>
      </div>
    </div>
  );
}
