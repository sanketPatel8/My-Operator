"use client";
import DashboardHeaader from "@/component/DashboardHeaader";
import Sidebar from "../sidebar/page";
import { useState, useEffect, useRef } from "react";
import DropDown from "@/component/DropDown";
import { useRouter } from "next/navigation";
import { FiEye, FiMoreVertical } from 'react-icons/fi';

export default function WorkflowList() {
  const [activeTab, setActiveTab] = useState("/workflowlist");
  const router = useRouter();

  const [templates, setTemplates] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const storeId = 11; // ⬅️ Replace this with the actual store ID dynamically if needed

  const hasFetched = useRef(false);
  const workflowsFetched = useRef(false);

  // Initialize workflow data on first load
  useEffect(() => {
    if (workflowsFetched.current) return;

   const initializeWorkflows = async () => {
      try {
        // ✅ Always POST first to sync/update categories
        const initRes = await fetch('/api/category', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!initRes.ok) {
          throw new Error(`Failed to initialize workflows: ${initRes.status}`);
        }

        // ✅ Then fetch the updated workflows
        const updatedRes = await fetch('/api/category');
        if (!updatedRes.ok) {
          throw new Error(`Failed to fetch categories after POST: ${updatedRes.status}`);
        }

        const updatedData = await updatedRes.json();

        console.log("✅ updated fulllllllll::::::::", updatedData);

        if (updatedData.success) {
          setWorkflows(updatedData.categories);
          workflowsFetched.current = true;
        }
      } catch (err) {
        console.error("❌ Error with workflows:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };


    initializeWorkflows();
  }, []);

  useEffect(() => {
    if (!storeId || hasFetched.current) return;

    const fetchTemplates = async () => {
      try {
        const res = await fetch(`/api/template-data?store_id=${storeId}`);

        if (!res.ok) {
          throw new Error(`Failed to fetch templates: ${res.status}`);
        }

        const data = await res.json();
        setTemplates(data); // data contains templates with nested data and variables
        hasFetched.current = true;
      } catch (err) {
        console.error("Error fetching templates:", err);
        // Don't set error for templates as it's not critical for workflow display
      }
    };

    fetchTemplates();
  }, [storeId]);

  // Transform workflow data to match DropDown component format
  const transformWorkflowToReminders = (workflow) => {
    if (!workflow || !workflow.events) return [];
    
    return workflow.events.map((event, index) => ({
      id: event.eventId || index + 1,
      enabled: false, // Default to false as shown in your images
      title: event.title,
      text: event.subtitle,
      footerText: event.delay ? `Send after ${event.delay}` : ''
    }));
  };

  const handleToggle = (workflowId, reminderId) => {
    if (!workflowId || !reminderId) return;
    
    setWorkflows((prev) =>
      prev.map((workflow) => {
        if (workflow.categoryId === workflowId) {
          return {
            ...workflow,
            events: workflow.events.map((event) =>
              event.eventId === reminderId 
                ? { ...event, enabled: !event.enabled }
                : event
            )
          };
        }
        return workflow;
      })
    );
  };

  const handleEyeClick = (reminder) => {
    console.log('Eye clicked:', reminder);
  };

  const handleMoreClick = (reminder) => {
    console.log('More clicked:', reminder);
  };

  // Static workflow configurations for display
  const workflowConfigs = [
    {
      name: "Abandoned Cart Recovery",
      description: "Recover potentially lost sales by sending automated reminders",
      icon: "/assets/cart_1.svg"
    },
    {
      name: "Order life cycle Notification", 
      description: "Automate essential communications and enable direct customer interaction for key order events",
      icon: "/assets/box.svg"
    },
    {
      name: "Cash-on-Delivery (COD) Management",
      description: "Automate COD order confirmations, cancellations, and conversion to prepaid to reduce fraud and non-deliveries.",
      icon: "/assets/wallet.svg"
    },
    {
      name: "Welcome Notifications",
      description: "Engage new customers as soon as they are created.",
      icon: "/assets/person-plus.svg"
    },
    {
      name: "Custom workflow",
      description: "Create your own custom automation workflow.",
      icon: "/assets/settings2.svg",
      hasButton: true,
      buttonText: "Create flow",
      onClickButton: () => router.push("/createflow")
    }
  ];

  if (loading) {
    return (
      <div className="font-source-sans flex flex-col min-h-screen">
        <DashboardHeaader />
        <div className="p-[16px] flex flex-1 bg-[#E9E9E9]">
          <Sidebar active={activeTab} onChange={setActiveTab} />
          <main className="flex-1 bg-white border-l border-[#E9E9E9] flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading workflows...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="font-source-sans flex flex-col min-h-screen">
        <DashboardHeaader />
        <div className="p-[16px] flex flex-1 bg-[#E9E9E9]">
          <Sidebar active={activeTab} onChange={setActiveTab} />
          <main className="flex-1 bg-white border-l border-[#E9E9E9] flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-600 mb-4">
                <p className="text-lg font-semibold">Error loading workflows</p>
                <p className="text-sm">{error}</p>
              </div>
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

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

          <div className="w-full mb-[15px]">
            {workflowConfigs.map((config, configIndex) => {
              // Find matching workflow data from database
              const workflowData = workflows.find(w => 
                w.categoryName === config.name
              );
              
              // Use database data if available, otherwise fallback to empty array
              const reminders = workflowData 
                ? transformWorkflowToReminders(workflowData)
                : [];

              return (
                <div key={configIndex} className={configIndex === 0 ? "mt-[24px]" : "mt-[16px]"}>
                  <DropDown
                    title={config.name}
                    description={config.description}
                    reminders={reminders}
                    src={config.icon}
                    onToggle={(reminderId) => handleToggle(workflowData?.categoryId, reminderId)}
                    onEyeClick={handleEyeClick}
                    onMoreClick={handleMoreClick}
                    EyeIcon={FiEye}
                    MoreIcon={FiMoreVertical}
                    onEditFlow={(reminder) => console.log("Edit:", reminder)}
                    onDeleteFlow={(reminder) => console.log("Delete:", reminder)}
                    buttonText={config.buttonText}
                    onClickButton={config.onClickButton}
                  />
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}