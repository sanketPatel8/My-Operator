"use client";
import DashboardHeaader from "@/component/DashboardHeaader";
import Sidebar from "@/component/Sidebar";
import { useState, useEffect, useRef } from "react";
import DropDown from "@/component/DropDown";
import { useRouter } from "next/navigation";
import { FiEye, FiMoreVertical } from "react-icons/fi";
import { useWorkflow } from "@/component/WorkflowContext";
import { useToastContext } from "@/component/Toast";
import ChatPreviewPopup from "@/component/ChatPreviewPopup";
import CustomWorkflowDeleteModal from "@/component/CustomWorkflowDeleteModal ";

export default function WorkflowList() {
  const [activeTab, setActiveTab] = useState("/workflowlist");
  const router = useRouter();
  const { success, error } = useToastContext();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [previewPopup, setPreviewPopup] = useState({
    isOpen: false,
    categoryEventId: null,
    reminderTitle: "",
  });

  const [workflows, setWorkflows] = useState([]);
  const [customWorkflowCount, setCustomWorkflowCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error1, setError] = useState(null);
  const [loadingToggles, setLoadingToggles] = useState([]);

  const [deleteLoading, setDeleteLoading] = useState(null);

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

        if (!storeToken) {
          console.log("⚠️ No store token found in localStorage");
          setIsRedirecting(true);
          console.log("redirecttion::", process.env.NEXT_PUBLIC_REDIRECT_URL);

          window.location.href = process.env.NEXT_PUBLIC_REDIRECT_URL;
          return;
        }

        // ✅ Always POST first to sync/update categories
        const initRes = await fetch("/api/category", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ storeToken }),
        });

        if (!initRes.ok) {
          throw new Error(`Failed to initialize workflows: ${initRes.status}`);
        }

        console.log("status post api:::", initRes);

        // ✅ Then fetch the updated workflows
        const updatedRes = await fetch(
          `/api/category?storeToken=${storeToken}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            signal: AbortSignal.timeout(30000),
          }
        );
        if (!updatedRes.ok) {
          throw new Error(
            `Failed to fetch categories after POST: ${updatedRes.status}`
          );
        }

        const updatedData = await updatedRes.json();

        console.log("✅ Updated workflow data:", updatedData);

        if (updatedData.success) {
          setWorkflows(updatedData.categories);

          // Count custom workflows (category_id = 61)
          const customWorkflows = updatedData.categories.find(
            (cat) => cat.category_id === 61
          );
          const customCount = customWorkflows
            ? customWorkflows.events.length
            : 0;
          setCustomWorkflowCount(customCount);

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

  // Helper function to check if a toggle should be disabled
  const isToggleDisabled = (workflowData, eventTitle) => {
    if (!workflowData || !workflowData.events) return false;

    // Only disable "Convert COD to Paid" if "COD Order Confirmation or Cancel" is off
    if (eventTitle === "Convert COD to Paid") {
      const codConfirmEvent = workflowData.events.find(
        (event) => event.title === "COD Order Confirmation or Cancel"
      );
      return !codConfirmEvent || codConfirmEvent.status !== 1;
    }

    return false;
  };

  // Transform workflow data to match DropDown component format
  const transformWorkflowToReminders = (workflow) => {
    if (!workflow || !workflow.events) return [];

    return workflow.events.map((event, index) => ({
      id: event.category_event_id || index + 1,
      title: event.title,
      enabled: event.status === 1 ? true : false,
      disabled: isToggleDisabled(workflow, event.title), // Add disabled property
      text: event.subtitle,
      footerText: event.delay ? `Send after ${event.delay}` : "",
      category_id: workflow.category_id,
      categoryName: workflow.categoryName,
      category_event_id: event.category_event_id,
    }));
  };

  

// Updated handleToggle function with better template checking
const handleToggle = async (workflowId, reminderId) => {
  if (!workflowId || !reminderId) return;

  const toggleKey = `${workflowId}:${reminderId}`;
  const storeToken = localStorage.getItem("storeToken");
  
  // Find current workflow and reminder
  const currentWorkflow = workflows.find(wf => wf.category_id === workflowId);
  const currentReminder = currentWorkflow?.events.find(ev => ev.category_event_id === reminderId);

  if (!currentReminder) return;

  // Check if this toggle is disabled
  if (isToggleDisabled(currentWorkflow, currentReminder.title)) {
    error('Please enable "COD Order Confirmation or Cancel" first to enable this option.');
    return;
  }

  const currentStatus = currentReminder?.status ?? 0;
  const newStatus = currentStatus === 1 ? 0 : 1;

  // 🚀 TURNING ON LOGIC (status 0 -> 1) - Same logic but with instant UI
  if (currentStatus === 0 && newStatus === 1) {
    
    // 🎯 INSTANT UI UPDATE: Show toggle as ON immediately on click
    setWorkflows((prev) =>
      prev.map((workflow) => {
        if (workflow.category_id === workflowId) {
          return {
            ...workflow,
            events: workflow.events.map((event) => {
              if (event.category_event_id === reminderId) {
                return { ...event, status: 1 };
              }
              return event;
            })
          };
        }
        return workflow;
      })
    );

    try {
      // Add loading state (but UI already shows ON)
      setLoadingToggles((prev) => [...prev, toggleKey]);

      // Use existing PATCH API to check template_id with checkOnly flag
      const validateResponse = await fetch('/api/category', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeToken: storeToken,
          category_event_id: reminderId,
          status: 1,
          checkOnly: true, // Flag to just check template_id without updating
        }),
      });

      const validateResult = await validateResponse.json();

      if (!validateResponse.ok || !validateResult.success) {
        throw new Error(validateResult.message || 'Failed to validate template');
      }

      // If template_id is null, redirect to edit flow instead of turning toggle ON
      if (!validateResult.templateId || validateResult.templateId === null) {
        console.log("🔄 No template found, redirecting to edit flow");

        // 🔄 REVERT UI: Toggle back to OFF before redirecting
        setWorkflows((prev) =>
          prev.map((workflow) => {
            if (workflow.category_id === workflowId) {
              return {
                ...workflow,
                events: workflow.events.map((event) => {
                  if (event.category_event_id === reminderId) {
                    return { ...event, status: currentStatus };
                  }
                  return event;
                })
              };
            }
            return workflow;
          })
        );

        // Create reminder object for navigation
        const reminderForNavigation = {
          category_id: workflowId,
          categoryName: currentWorkflow.categoryName || 'Unknown Category',
          category_event_id: reminderId,
          title: currentReminder.title || 'Untitled Event',
          text: currentReminder.subtitle || '',
          footerText: currentReminder.delay ? `Send after ${currentReminder.delay}` : 'Send after 1 hour'
        };

        // Navigate to edit flow
        const delayText = reminderForNavigation.footerText || '';
        const cleanDelay = delayText.replace('Send after ', '').trim() || '1 hour';
        
        const queryParams = new URLSearchParams({
          category_id: reminderForNavigation.category_id,
          categoryName: reminderForNavigation.categoryName,
          category_event_id: String(reminderForNavigation.category_event_id),
          eventTitle: reminderForNavigation.title,
          eventSubtitle: reminderForNavigation.text,
          eventDelay: cleanDelay
        });
        
        // Redirect to edit flow
        router.push(`/editflow/${queryParams.get("category_event_id")}`);
        return;
      }

      // If template_id exists, proceed with turning the toggle ON
      const updateResponse = await fetch('/api/category', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeToken: storeToken,
          category_event_id: reminderId,
          status: 1,
        }),
      });

      const updateResult = await updateResponse.json();

      if (!updateResponse.ok || !updateResult.success) {
        throw new Error(updateResult.message || 'Failed to update status');
      }

      console.log("✅ Toggle enabled successfully (template exists)");
      // UI is already ON, no need to update again

    } catch (error) {
      console.error('❌ Error enabling workflow:', error.message);
      
      // 🔄 ROLLBACK: Revert UI to original state on error
      setWorkflows((prev) =>
        prev.map((workflow) => {
          if (workflow.category_id === workflowId) {
            return {
              ...workflow,
              events: workflow.events.map((event) => {
                if (event.category_event_id === reminderId) {
                  return { ...event, status: currentStatus }; // Revert to original status
                }
                return event;
              })
            };
          }
          return workflow;
        })
      );
      
      error('Failed to enable workflow. Please try again.');
    } finally {
      // Remove loading state
      setLoadingToggles((prev) => prev.filter((key) => key !== toggleKey));
    }

    return; // Exit early for status 0 -> 1 case
  }

  // 🚀 TURNING OFF LOGIC (status 1 -> 0) - remains the same
  const isCodConfirmBeingTurnedOff = 
    currentReminder.title === "COD Order Confirmation or Cancel" && newStatus === 0;

  let additionalUpdates = [];
  if (isCodConfirmBeingTurnedOff) {
    const convertCodEvent = currentWorkflow.events.find(
      event => event.title === "Convert COD to Paid"
    );
    if (convertCodEvent && convertCodEvent.status === 1) {
      additionalUpdates.push({
        category_event_id: convertCodEvent.category_event_id,
        status: 0
      });
    }
  }

  // Optimistic update for turning OFF
  setWorkflows((prev) =>
    prev.map((workflow) => {
      if (workflow.category_id === workflowId) {
        return {
          ...workflow,
          events: workflow.events.map((event) => {
            if (event.category_event_id === reminderId) {
              return { ...event, status: newStatus };
            }
            if (isCodConfirmBeingTurnedOff && event.title === "Convert COD to Paid") {
              return { ...event, status: 0 };
            }
            return event;
          })
        };
      }
      return workflow;
    })
  );

  setLoadingToggles((prev) => [...prev, toggleKey]);

  try {
    // Update the primary toggle
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

    // Update additional dependent toggles
    for (const update of additionalUpdates) {
      const additionalRes = await fetch('/api/category', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeToken: storeToken,
          category_event_id: update.category_event_id,
          status: update.status,
        }),
      });

      const additionalResult = await additionalRes.json();
      if (!additionalRes.ok || !additionalResult.success) {
        console.error('❌ Failed to update dependent toggle:', additionalResult.message);
      }
    }

    console.log('✅ Toggle updated successfully:', result);
    
    if (isCodConfirmBeingTurnedOff && additionalUpdates.length > 0) {
      success('COD Order Confirmation disabled. Convert COD to Paid has been automatically disabled as well.');
    } 
    
  } catch (error) {
    console.error('❌ Error updating toggle status:', error.message);
    
    // Rollback optimistic update on error
    setWorkflows((prev) =>
      prev.map((workflow) => {
        if (workflow.category_id === workflowId) {
          return {
            ...workflow,
            events: workflow.events.map((event) => {
              if (event.category_event_id === reminderId) {
                return { ...event, status: currentStatus };
              }
              if (isCodConfirmBeingTurnedOff && event.title === "Convert COD to Paid") {
                const originalConvertStatus = currentWorkflow.events.find(
                  e => e.title === "Convert COD to Paid"
                )?.status ?? 0;
                return { ...event, status: originalConvertStatus };
              }
              return event;
            })
          };
        }
        return workflow;
      })
    );
    
    error('Failed to update toggle status. Please try again.');
    
  } finally {
    setLoadingToggles((prev) => prev.filter((key) => key !== toggleKey));
  }
};

  const handleEyeClick = (reminder) => {
    console.log("=== EYE CLICK DEBUG ===");
    console.log("Full reminder object:", reminder);
    console.log("reminder.category_event_id:", reminder.category_event_id);
    console.log("reminder.id:", reminder.id);
    console.log("=== END DEBUG ===");

    // Check if reminder has required data for preview
    if (!reminder.category_event_id) {
      console.error("❌ No category_event_id found in reminder:", reminder);
      error(
        "Unable to preview: Missing event data. Please ensure the workflow is properly configured."
      );
      return;
    }

    console.log(
      "✅ Opening preview for categoryEventId:",
      reminder.category_event_id
    );

    // Open the preview popup
    setPreviewPopup({
      isOpen: true,
      categoryEventId: reminder.category_event_id,
      reminderTitle: reminder.title,
    });
  };

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedReminderForDelete, setSelectedReminderForDelete] =
    useState(null);

  const handleDeleteFlow = async (reminder) => {
    console.log("Delete flow for reminder:", reminder);

    if (!reminder.category_event_id) {
      error("Unable to delete: Missing workflow identifier");
      return;
    }

    // Enhanced confirmation dialog
    const confirmMessage = `Are you sure you want to delete "${reminder.title}"?\n\nThis action cannot be undone and will remove:\n• The workflow configuration\n• All template mappings\n• Variable settings\n\nClick "DELETE" to confirm:`;

    const storeToken = localStorage.getItem("storeToken");

    try {
      setDeleteLoading(reminder.category_event_id);

      const response = await fetch("/api/custom-workflow", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeToken: storeToken,
          category_event_id: reminder.category_event_id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log("✅ Workflow deleted successfully");

        // Update the local state - remove the deleted workflow
        setWorkflows((prev) =>
          prev.map((workflow) => {
            if (workflow.category_id === reminder.category_id) {
              return {
                ...workflow,
                events: workflow.events.filter(
                  (event) =>
                    event.category_event_id !== reminder.category_event_id
                ),
              };
            }
            return workflow;
          })
        );

        if (reminder.category_id === 61) {
          setCustomWorkflowCount((prev) => prev - 1);
        }

        success(`Workflow "${reminder.title}" deleted successfully!`);
      } else {
        throw new Error(result.message || "Failed to delete workflow");
      }
    } catch (error) {
      console.error("❌ Error deleting workflow:", error);
      error(`Failed to delete workflow: ${error.message}`);
    } finally {
      setDeleteLoading(null);
    }
  };

  // Add this before the closing </div> of your main component:

  // 4. ADD THIS NEW FUNCTION (place it after handleEyeClick)
  const closePreviewPopup = () => {
    setPreviewPopup({
      isOpen: false,
      categoryEventId: null,
      reminderTitle: "",
    });
  };

  const handleMoreClick = (reminder) => {
    console.log("More clicked:", reminder);
  };

  // // Handle delete flow - NEW FUNCTION
  // const handleDeleteFlow = async (reminder) => {
  //   const storeToken = localStorage.getItem("storeToken");
  //   console.log("Delete flow for reminder:", reminder);

  //   if (!reminder.category_event_id) {
  //     console.error('No category_event_id found for deletion');
  //     return;
  //   }

  //   // Confirm deletion
  //   const confirmed = window.confirm(
  //     `Are you sure you want to delete the template data for "${reminder.title}"?\n\nThis will remove all template configurations but keep the workflow event.`
  //   );

  //   if (!confirmed) return;

  //   try {
  //     setDeleteLoading(reminder.category_event_id);

  //     const response = await fetch('/api/category', {
  //       method: 'DELETE',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         storeToken: storeToken,
  //         category_event_id: reminder.category_event_id
  //       })
  //     });

  //     const result = await response.json();

  //     if (result.success) {
  //       console.log('✅ Template data deleted successfully');

  //       // Update the local state to reflect the changes
  //       setWorkflows((prev) =>
  //         prev.map((workflow) => {
  //           if (workflow.category_id === reminder.category_id) {
  //             return {
  //               ...workflow,
  //               events: workflow.events.map((event) =>
  //                 event.category_event_id === reminder.category_event_id
  //                   ? {
  //                       ...event,
  //                       template_id: null,
  //                       template_data_id: null,
  //                       template_variable_id: null
  //                     }
  //                   : event
  //               )
  //             };
  //           }
  //           return workflow;
  //         })
  //       );

  //       // Show success message
  //       success('Template data deleted successfully!');

  //     } else {
  //       console.error('❌ Failed to delete template data:', result.message);
  //       error(`Failed to delete template data: ${result.message}`);
  //     }
  //   } catch (error) {
  //     console.error('❌ Error deleting template data:', error);
  //     error('An error occurred while deleting template data. Please try again.');
  //   } finally {
  //     setDeleteLoading(null);
  //   }
  // };

  // Handle edit flow navigation with specific event data
  const handleEditFlow = (reminder) => {
    console.log("Edit flow for reminder:", reminder);

    const delayText = reminder.footerText || "";
    const cleanDelay = delayText.replace("Send after ", "").trim() || "1 hour";

    // Navigate to edit flow with query parameters - ENSURE ALL PARAMS ARE PRESENT
    const queryParams = new URLSearchParams({
      category_id: reminder.category_id,
      categoryName: reminder.categoryName || "Unknown Category",
      category_event_id: String(reminder.category_event_id),
      eventTitle: reminder.title || "Untitled Event",
      eventSubtitle: reminder.text || "",
      eventDelay: cleanDelay,
    });

    console.log(
      "Navigating to edit flow with params:",
      queryParams.get("category_event_id")
    );

    router.push(`/editflow/${queryParams.get("category_event_id")}`);
  };

  // Static workflow configurations for display
  const workflowConfigs = [
    {
      name: "Abandoned Cart Recovery",
      description:
        "Recover potentially lost sales by sending automated reminders",
      icon: "/assets/cart_1.svg",
    },
    {
      name: "Order life cycle Notifications",
      description:
        "Automate essential communications and enable direct customer interaction for key order events",
      icon: "/assets/box.svg",
    },
    {
      name: "Cash-on-Delivery (COD) Management",
      description:
        "Automate COD order confirmations, cancellations, and conversion to prepaid to reduce fraud and non-deliveries.",
      icon: "/assets/wallet.svg",
    },
    {
      name: "Welcome Notifications",
      description: "Engage new customers as soon as they are created.",
      icon: "/assets/person-plus.svg",
    },
    {
      name: "Custom workflow",
      description: "Create your own custom automation workflow.",
      icon: "/assets/settings2.svg",
      hasButton: true,
      buttonText: "Create flow",
      onClickButton:
        customWorkflowCount >= 3
          ? () =>
              error(
                "Maximum 3 custom workflows allowed. Please delete an existing workflow to create a new one."
              )
          : () => router.push("/createflow"),
    },
  ];

  if (isRedirecting) {
    return (
      <div className="font-source-sans flex flex-col min-h-screen">
        <div className="p-[16px] flex flex-col md:flex-row flex-1 bg-[#E9E9E9]">
          <main className="flex-1 bg-white border-l border-[#E9E9E9] flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

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

  if (error1) {
    return (
      <div className="font-source-sans flex flex-col min-h-screen">
        <DashboardHeaader />
        <div className="p-[16px] flex flex-1 bg-[#E9E9E9]">
          <Sidebar active={activeTab} onChange={setActiveTab} />
          <main className="flex-1 bg-white border-l border-[#E9E9E9] flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-600 mb-4">
                <p className="text-lg font-semibold">Error loading workflows</p>
                <p className="text-sm">{error1}</p>
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
              const workflowData = workflows.find(
                (w) => w.categoryName === config.name
              );
              console.log("workflows:::", workflows);

              // Use database data if available, otherwise fallback to empty array
              const reminders = workflowData
                ? transformWorkflowToReminders(workflowData)
                : [];

              // Debug logging to verify data structure
              console.log(`Workflow "${config.name}":`, {
                workflowData,
                reminders,
                hasEvents: workflowData?.events?.length || 0,
              });

              return (
                <div
                  key={configIndex}
                  className={configIndex === 0 ? "mt-[24px]" : "mt-[16px]"}
                >
                  <DropDown
                    title={config.name}
                    description={config.description}
                    reminders={reminders}
                    src={config.icon}
                    onToggle={(reminderId) =>
                      handleToggle(workflowData?.category_id, reminderId)
                    }
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
      <ChatPreviewPopup
        isOpen={previewPopup.isOpen}
        onClose={closePreviewPopup}
        categoryEventId={previewPopup.categoryEventId}
        storeToken={localStorage.getItem("storeToken")}
      />
    </div>
  );
}
