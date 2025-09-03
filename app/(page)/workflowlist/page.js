"use client";
import DashboardHeaader from "@/component/DashboardHeaader";
import Sidebar from "../sidebar/page";
import { useState, useEffect, useRef } from "react";
import DropDown from "@/component/DropDown";
import { useRouter } from "next/navigation";
import { FiEye, FiMoreVertical } from 'react-icons/fi';
import { useWorkflow } from "@/component/WorkflowContext";

export default function WorkflowList() {
  const [activeTab, setActiveTab] = useState("/workflowlist");
  const router = useRouter();

  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingToggles, setLoadingToggles] = useState([]);


  const [deleteLoading, setDeleteLoading] = useState(null); // Track which item is being deleted
  const storeId = 11; // ⬅️ Replace this with the actual store ID dynamically if needed

  const hasFetched = useRef(false);
  const workflowsFetched = useRef(false);
  const { fetched, setFetched } = useWorkflow();

  // Initialize workflow data on first load
  useEffect(() => {
    console.log("🟡 useEffect ran. fetched =", hasFetched.current);
    if (hasFetched.current) return;

   const initializeWorkflows = async () => {
      try {
        const storeToken = localStorage.getItem("storeToken");
        // ✅ Always POST first to sync/update categories
        const initRes = await fetch('/api/category', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ storeToken })
        });

        if (!initRes.ok) {
          throw new Error(`Failed to initialize workflows: ${initRes.status}`);
        }

        console.log("status post api:::", initRes);
        

        // ✅ Then fetch the updated workflows
        const updatedRes = await fetch(`/api/category?storeToken=${encodeURIComponent(storeToken)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(30000)
      });
        if (!updatedRes.ok) {
          throw new Error(`Failed to fetch categories after POST: ${updatedRes.status}`);
        }

        const updatedData = await updatedRes.json();

        console.log("✅ Updated workflow data:", updatedData);

        if (updatedData.success) {
          setWorkflows(updatedData.categories);
          workflowsFetched.current = true;
          setFetched(true);
          hasFetched.current = true;
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

  // Transform workflow data to match DropDown component format
  const transformWorkflowToReminders = (workflow) => {
    if (!workflow || !workflow.events) return [];
    
    return workflow.events.map((event, index) => ({
      id: event.category_event_id || index + 1,
      title: event.title,
      enabled: event.status === 1 ? true : false,
      text: event.subtitle,
      footerText: event.delay ? `Send after ${event.delay}` : '',
      category_id: workflow.category_id,
      categoryName: workflow.categoryName,
      category_event_id: event.category_event_id
    }));
  };

  const handleToggle = async (workflowId, reminderId) => {
  if (!workflowId || !reminderId) return;

  const toggleKey = `${workflowId}:${reminderId}`;
  const storeToken = localStorage.getItem("storeToken");
  
  // Find current reminder and status
  const currentReminder = workflows
    .find(wf => wf.category_id === workflowId)
    ?.events.find(ev => ev.category_event_id === reminderId);

  const currentStatus = currentReminder?.status ?? 0;
  const newStatus = currentStatus === 1 ? 0 : 1;

  // 🚀 OPTIMISTIC UPDATE: Update UI immediately
  setWorkflows((prev) =>
    prev.map((workflow) => {
      if (workflow.category_id === workflowId) {
        return {
          ...workflow,
          events: workflow.events.map((event) =>
            event.category_event_id === reminderId
              ? { ...event, status: newStatus }
              : event
          )
        };
      }
      return workflow;
    })
  );

  // Add loading state for visual feedback (optional spinner/disabled state)
  setLoadingToggles((prev) => [...prev, toggleKey]);

  try {
    const res = await fetch('/api/category', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeToken: storeToken,
        category_event_id: reminderId,
        status: newStatus,
      }),
    });

    const result = await res.json();

    if (!res.ok || !result.success) {
      throw new Error(result.message || 'Failed to update status');
    }

    // ✅ Success - UI is already updated, just log or show success feedback
    console.log('✅ Toggle updated successfully:', result);
    
  } catch (error) {
    console.error('❌ Error updating toggle status:', error.message);
    
    // 🔄 ROLLBACK: Revert the optimistic update on error
    setWorkflows((prev) =>
      prev.map((workflow) => {
        if (workflow.category_id === workflowId) {
          return {
            ...workflow,
            events: workflow.events.map((event) =>
              event.category_event_id === reminderId
                ? { ...event, status: currentStatus } // Revert to original status
                : event
            )
          };
        }
        return workflow;
      })
    );
    
    // Show error message to user
    alert('Failed to update toggle status. Please try again.');
    
  } finally {
    // Remove loading state
    setLoadingToggles((prev) => prev.filter((key) => key !== toggleKey));
  }
};



  const handleEyeClick = (reminder) => {
    console.log('Eye clicked:', reminder);
  };

  const handleMoreClick = (reminder) => {
    console.log('More clicked:', reminder);
  };

  // Handle delete flow - NEW FUNCTION
  const handleDeleteFlow = async (reminder) => {
    const storeToken = localStorage.getItem("storeToken");
    console.log("Delete flow for reminder:", reminder);
    
    if (!reminder.category_event_id) {
      console.error('No category_event_id found for deletion');
      return;
    }

    // Confirm deletion
    const confirmed = window.confirm(
      `Are you sure you want to delete the template data for "${reminder.title}"?\n\nThis will remove all template configurations but keep the workflow event.`
    );
    
    if (!confirmed) return;

    try {
      setDeleteLoading(reminder.category_event_id);
      
      const response = await fetch('/api/category', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeToken: storeToken,
          category_event_id: reminder.category_event_id
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Template data deleted successfully');
        
        // Update the local state to reflect the changes
        setWorkflows((prev) =>
          prev.map((workflow) => {
            if (workflow.category_id === reminder.category_id) {
              return {
                ...workflow,
                events: workflow.events.map((event) =>
                  event.category_event_id === reminder.category_event_id
                    ? {
                        ...event,
                        template_id: null,
                        template_data_id: null,
                        template_variable_id: null
                      }
                    : event
                )
              };
            }
            return workflow;
          })
        );
        
        // Show success message
        alert('Template data deleted successfully!');
        
      } else {
        console.error('❌ Failed to delete template data:', result.message);
        alert(`Failed to delete template data: ${result.message}`);
      }
    } catch (error) {
      console.error('❌ Error deleting template data:', error);
      alert('An error occurred while deleting template data. Please try again.');
    } finally {
      setDeleteLoading(null);
    }
  };

  // Handle edit flow navigation with specific event data
  const handleEditFlow = (reminder) => {
    console.log("Edit flow for reminder:", reminder);
    
    const delayText = reminder.footerText || '';
    const cleanDelay = delayText.replace('Send after ', '').trim() || '1 hour';
    
    // Navigate to edit flow with query parameters - ENSURE ALL PARAMS ARE PRESENT
    const queryParams = new URLSearchParams({
      category_id: reminder.category_id,
      categoryName: reminder.categoryName || 'Unknown Category',
      category_event_id: String(reminder.category_event_id),
      eventTitle: reminder.title || 'Untitled Event',
      eventSubtitle: reminder.text || '',
      eventDelay: cleanDelay
    });
    
    console.log("Navigating to edit flow with params:", queryParams.get("category_event_id"));
    
    router.push(`/editflow/${queryParams.get("category_event_id")}`);
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

              // Debug logging to verify data structure
              console.log(`Workflow "${config.name}":`, {
                workflowData,
                reminders,
                hasEvents: workflowData?.events?.length || 0
              });

              return (
                <div key={configIndex} className={configIndex === 0 ? "mt-[24px]" : "mt-[16px]"}>
                  <DropDown
                    title={config.name}
                    description={config.description}
                    reminders={reminders}
                    src={config.icon}
                    onToggle={(reminderId) => handleToggle(workflowData?.category_id, reminderId)}
                    onEyeClick={handleEyeClick}
                    onMoreClick={handleMoreClick}
                    EyeIcon={FiEye}
                    MoreIcon={FiMoreVertical}
                    onEditFlow={handleEditFlow} // Pass the edit handler
                    onDeleteFlow={handleDeleteFlow} // Pass the DELETE handler
                    deleteLoading={deleteLoading}
                    loadingToggles={loadingToggles} // Pass loading state
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