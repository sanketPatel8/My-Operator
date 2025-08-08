"use client";
import DashboardHeaader from "@/component/DashboardHeaader";
import Sidebar from "../sidebar/page";
import { useState } from "react";
import DropDown from "@/component/DropDown";
import { FiEye, FiMoreVertical } from 'react-icons/fi';

export default function WorkflowList() {
  const [activeTab, setActiveTab] = useState("/workflowlist");
  const [reminders, setReminders] = useState([
    {
      id: 1,
      enabled: true,
      title: 'Reminder 1',
      text: 'First message about your cart!',
      footerText: 'Send after 1 hour'
    },
    {
      id: 2,
      enabled: false,
      title: 'Reminder 2',
      text: 'Second message to re-engage.',
      footerText: 'Scheduled 4 hours later'
    },
    {
      id: 3,
      enabled: true,
      title: 'Reminder 3',
      text: 'Final message before cart expires.',
      footerText: '' // You can leave it empty to hide it
    }
  ]);


  const handleToggle = (id) => {
    setReminders((prev) =>
      prev.map((reminder) =>
        reminder.id === id ? { ...reminder, enabled: !reminder.enabled } : reminder
      )
    );
  };

  const handleEyeClick = (reminder) => {
    console.log('Eye clicked:', reminder);
  };

  const handleMoreClick = (reminder) => {
    console.log('More clicked:', reminder);
  };

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
              Configure your WhatsApp automation flows and message templates.
            </p>
          </div>

          <div className="w-full max-w-[1084px] mb-[15px]">
            <div className="mt-[24px]">
              <DropDown
                title="Abandoned Cart Recovery"
                description="Recover potentially lost sales by sending automated reminders"
                reminders={reminders}
                src="/assets/cart_1.svg"
                onToggle={handleToggle}
                onEyeClick={handleEyeClick}
                onMoreClick={handleMoreClick}
                EyeIcon={FiEye}
                MoreIcon={FiMoreVertical}
                onEditFlow={(reminder) => console.log("Edit:", reminder)}
                onDeleteFlow={(reminder) => console.log("Delete:", reminder)}
              />
            </div>
            <div className="mt-[16px]">
              <DropDown
                title="Order life cycle Notification"
                description="Automate essential communications and enable direct customer interaction for key order events"
                reminders={reminders}
                src="/assets/box.svg"
                onToggle={handleToggle}
                onEyeClick={handleEyeClick}
                onMoreClick={handleMoreClick}
                EyeIcon={FiEye}
                MoreIcon={FiMoreVertical}
                onEditFlow={(reminder) => console.log("Edit:", reminder)}
                onDeleteFlow={(reminder) => console.log("Delete:", reminder)}
              />
            </div>
            <div className="mt-[16px]">
              <DropDown
                title="Cash-on-Delivery (COD) Management"
                description="Automate COD order confirmations, cancellations, and conversion to prepaid to reduce fraud and non-deliveries."
                reminders={reminders}
                src="/assets/wallet.svg"
                onToggle={handleToggle}
                onEyeClick={handleEyeClick}
                onMoreClick={handleMoreClick}
                EyeIcon={FiEye}
                MoreIcon={FiMoreVertical}
                onEditFlow={(reminder) => console.log("Edit:", reminder)}
                onDeleteFlow={(reminder) => console.log("Delete:", reminder)}
              />
            </div>
            <div className="mt-[16px]">
              <DropDown
                title="Welcome Notifications"
                description="Engage new customers as soon as they are created."
                reminders={reminders}
                src="/assets/person-plus.svg"
                onToggle={handleToggle}
                onEyeClick={handleEyeClick}
                onMoreClick={handleMoreClick}
                EyeIcon={FiEye}
                MoreIcon={FiMoreVertical}
                onEditFlow={(reminder) => console.log("Edit:", reminder)}
                onDeleteFlow={(reminder) => console.log("Delete:", reminder)}
              />
            </div>
            <div className="mt-[16px]">
              <DropDown
                title="Custom workflow"
                description="Automate COD order confirmations, cancellations, and conversion to prepaid to reduce fraud and non-deliveries."
                reminders={reminders}
                src="/assets/settings2.svg"
                onToggle={handleToggle}
                onEyeClick={handleEyeClick}
                onMoreClick={handleMoreClick}
                EyeIcon={FiEye}
                MoreIcon={FiMoreVertical}
                onEditFlow={(reminder) => console.log("Edit:", reminder)}
                onDeleteFlow={(reminder) => console.log("Delete:", reminder)}
                buttonText="Create flow"
                onClickButton={() => console.log("Create flow clicked")}
              />
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
