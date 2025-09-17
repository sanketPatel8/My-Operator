"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import DashboardHeaader from "@/component/DashboardHeaader";
import Sidebar from "../../sidebar/page";
import Image from "next/image";
import { FiChevronDown } from "react-icons/fi";
import { Listbox } from "@headlessui/react";
import { useToastContext } from "@/component/Toast";

import { POST } from "@/utils/api";
import { useModal } from "@/hook/useModel";
import CustomModal from "@/component/CustomModal";
import React from "react";

function Editflow() {
  const router = useRouter();
  const params = useParams();
  const { success, error } = useToastContext();
  const { isOpen, openModal, closeModal } = useModal();

  const [showTestPopup, setShowTestPopup] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [testLoading, setTestLoading] = useState(false);

  const [selectedDelay, setSelectedDelay] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [categoryTemplateData, setCategoryTemplateData] = useState(null);
  const [activePart, setActivePart] = useState("template");
  const [templateMessage, setTemplateMessage] = useState("");
  const [matchingMapVab, SetMatchingMapVab] = useState([]);
  const [allTemplatesData, setAllTemplatesData] = useState([]);
  const [templateOptions, setTemplateOptions] = useState([]);
  const [loading1, setLoading1] = useState(false);
  const [loading, setLoading] = useState(true);
  const [buttons, setButtons] = useState([]);
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const [templateVariables, setTemplateVariables] = useState({
    header: [],
    body: [],
    buttons: [],
  });
  const [variableSettings, setVariableSettings] = useState({});
  const [openUp, setOpenUp] = useState(false);
  const selectRef = useRef(null);
  const [activeTab, setActiveTab] = useState("/workflowlist");
  const [currentWorkflowData, setCurrentWorkflowData] = useState(null);
  const [selectedTemplateData, setSelectedTemplateData] = useState(null);
  const [mappingFieldOptions, setMappingFieldOptions] = useState([]);
  const [customTemplateData, setCustomTemplateData] = useState({
    templateName: "",
    body: "",
    buttonText: "",
    buttonText2: "", // if second button is conditionally shown
  });

  const [variables, setVariables] = useState([]);
  const [fallbacks, setFallbacks] = useState({});

  useEffect(() => {
    const regex = /{{(.*?)}}/g;
    const matches = [...customTemplateData.body.matchAll(regex)].map((m) =>
      m[1].trim()
    );

    setVariables(matches);

    // Ensure fallbacks exist for all variables
    const newFallbacks = { ...fallbacks };
    matches.forEach((v) => {
      if (!(v in newFallbacks)) {
        newFallbacks[v] = "";
      }
    });
    setFallbacks(newFallbacks);
  }, [customTemplateData.body]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCustomTemplateData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFallbackChange = (variable, value) => {
    setFallbacks({ ...fallbacks, [variable]: value });
  };

  const note = `Note :- If the topic is COD Order Confirmation or Cancel, use this dynamic link format: 
  ${process.env.NEXT_PUBLIC_HOST}order-conformation?{{approve or cancel}} 
  If the topic is anything else, use this static redirect format: 
  ${process.env.NEXT_PUBLIC_HOST}redirect?url={{link}}`;

  // ✅ Add helper at top of file
  const normalizeTemplateData = (data) => {
    if (!data) return { content: [], mappingVariables: [] };
    if (Array.isArray(data)) {
      return {
        content: data[0]?.content || [],
        mappingVariables: data[0]?.mappingVariables || [],
      };
    }
    return {
      content: data.content || [],
      mappingVariables: data.mappingVariables || [],
    };
  };

  const checkDropdownPosition = () => {
    if (selectRef.current) {
      const rect = selectRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUp(spaceBelow < 200);
    }
  };

  // Single data loading effect - fetch everything ONCE
  async function loadAllData() {
    try {
      const storeToken = localStorage.getItem("storeToken");

      // 1. Get the current workflow data
      const workflowRes = await fetch(`/api/category?storeToken=${storeToken}`);
      if (!workflowRes.ok) throw new Error("Failed to fetch workflow data");

      const workflowData = await workflowRes.json();
      const categoryData = workflowData.categories.flatMap((category) =>
        (category.events || []).map((event) => ({
          id: event.category_event_id,
          category_id: category.category_id,
          category_event_id: event.category_event_id,
          title: event.title,
          subtitle: event.subtitle,
          delay: event.delay,
        }))
      );

      const matchedEvent = categoryData.find(
        (item) => item.category_event_id == params.id
      );
      if (matchedEvent) {
        setCurrentWorkflowData(matchedEvent);
        if (matchedEvent.delay) {
          setSelectedDelay(matchedEvent.delay);
        }
      }

      // 2. Load all templates for dropdown
      const templateResponse = await fetch(
        `/api/template-data?storeToken=${storeToken}`
      );
      if (!templateResponse.ok)
        throw new Error("Failed to fetch all templates");

      const templateData = await templateResponse.json();
      console.log("All templates data:", templateData);

      if (templateData.templates && templateData.templates.length > 0) {
        setTemplateOptions(templateData.templates.map((t) => t.template_name));
        setAllTemplatesData(templateData.templates);
      }

      // 3. Fetch category-specific template data ONCE (with all components)
      let categorySpecificData = null;
      if (matchedEvent) {
        try {
          const storeToken = localStorage.getItem("storeToken");
          let apiUrl = `/api/category-template?storeToken=${storeToken}&category_event_id=${matchedEvent.category_event_id}`;
          const response = await fetch(apiUrl);

          if (response.ok) {
            const data = await response.json();
            console.log("Category template data fetched once:", data);

            if (data.success && data.templates && data.templates.length > 0) {
              const templateGroup = data.templates[0];
              categorySpecificData = templateGroup;
              setCategoryTemplateData(templateGroup);
              setSelectedTemplate(templateGroup.template_name);

              const mappingVariables =
                templateGroup?.data?.[0]?.variables?.map((v) => ({
                  template_variable_id: v.template_variable_id,
                  variable_name: v.variable_name,
                  mapping_field: v.mapping_field,
                  fallback_value: v.fallback_value,
                  type: v.type,
                  component_type: v.component_type,
                })) || [];

              console.log("mapping variables::::::::::", mappingVariables);

              SetMatchingMapVab(mappingVariables || []);
            }
          }
        } catch (error) {
          console.error("Failed to fetch category template data:", error);
        }
      }

      // 4. Set default template if no category template found
      if (
        !categorySpecificData &&
        templateData.templates &&
        templateData.templates.length > 0
      ) {
        setSelectedTemplate(templateData.templates[0].template_name);
        setSelectedTemplateId(templateData.templates[0].template_id);
      }

      // 5. Process initial template data (category-specific or default)
      processInitialTemplateData(
        categorySpecificData,
        templateData.templates,
        categorySpecificData?.template_name ||
          templateData.templates[0]?.template_name
      );
    } catch (error) {
      console.error("Failed to load initial data", error);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadAllData();
  }, [params.id]);

  // Helper function to process template data initially
  const processInitialTemplateData = (
    categoryData,
    allTemplates,
    templateName
  ) => {
    if (!templateName || allTemplates.length === 0) return;

    let selectedTemplateObj;
    let contentBlocks = [];
    let mappingVariables = [];

    // Check if we have category-specific data
    if (categoryData && categoryData.template_name === templateName) {
      console.log("Processing category-specific template data:", categoryData);
      setSelectedTemplateData(categoryData);
      selectedTemplateObj = categoryData;

      const { content, mappingVariables: vars } = normalizeTemplateData(
        categoryData?.data
      );
      contentBlocks = content;
      mappingVariables = vars;
    } else {
      console.log("Processing general template data");
      setSelectedTemplateData(null);
      selectedTemplateObj = allTemplates.find(
        (template) => template.template_name === templateName
      );
      if (selectedTemplateObj) {
        const { content, mappingVariables: vars } = normalizeTemplateData(
          selectedTemplateObj?.data
        );
        contentBlocks = content;
        mappingVariables = vars;
      }
    }

    if (!selectedTemplateObj) return;

    // Process mapping field options
    const mappingOptions = mappingVariables
      .map((variable) => variable.mapping_field)
      .filter((field) => field && field.trim() !== "");

    const defaultOptions = [
      "Name",
      "Phone number",
      "Service number",
      "Order id",
      "Quantity",
      "Total price",
      "Payment Url",
      "Abandoned Cart Url",
      "Custom Link",
    ];
    const combinedOptions = [
      ...new Set([...defaultOptions, ...mappingOptions]),
    ];
    setMappingFieldOptions(combinedOptions);

    // Extract variables and process template content
    processTemplateContent(contentBlocks, mappingVariables);
  };

  // Process template content when selectedTemplate changes (WITHOUT fetching)
  useEffect(() => {
    if (!selectedTemplate || allTemplatesData.length === 0) return;

    let selectedTemplateObj;
    let contentBlocks = [];
    let mappingVariables = [];

    // Check if category template data matches selected template
    if (
      categoryTemplateData &&
      categoryTemplateData.template_name === selectedTemplate
    ) {
      console.log(
        "Using category-specific template data:",
        categoryTemplateData
      );
      setSelectedTemplateData(categoryTemplateData);

      const { content, mappingVariables: vars } = normalizeTemplateData(
        categoryTemplateData?.data
      );
      contentBlocks = content;
      mappingVariables = vars;
    } else {
      console.log("Using general template data");
      setSelectedTemplateData(null);
      selectedTemplateObj = allTemplatesData.find(
        (template) => template.template_name === selectedTemplate
      );
      if (selectedTemplateObj) {
        const { content, mappingVariables: vars } = normalizeTemplateData(
          selectedTemplateObj?.data
        );
        contentBlocks = content;
        mappingVariables = vars;
      }
    }

    if (!categoryTemplateData && !selectedTemplateObj) return;

    // Extract dropdown options from mappingVariables
    const mappingOptions = mappingVariables
      .map((variable) => variable.mapping_field)
      .filter((field) => field && field.trim() !== "");

    const defaultOptions = [
      "Name",
      "Phone number",
      "Service number",
      "Order id",
      "Quantity",
      "Total price",
      "Payment Url",
      "Abandoned Cart Url",
      "Custom Link",
    ];
    const combinedOptions = [
      ...new Set([...defaultOptions, ...mappingOptions]),
    ];
    setMappingFieldOptions(combinedOptions);

    // Process template content
    processTemplateContent(contentBlocks, mappingVariables);
  }, [selectedTemplate, allTemplatesData, categoryTemplateData]);

  const [dropdownDirection, setDropdownDirection] = useState({});

  const checkDropdownDirection = (variable, buttonRef) => {
    if (buttonRef) {
      const rect = buttonRef.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      setDropdownDirection((prev) => ({
        ...prev,
        [variable]: spaceBelow < 200 ? "up" : "down",
      }));
    }
  };

  // Helper function to process template content (header, body, buttons)
  const processTemplateContent = (contentBlocks, mappingVariables) => {
    const headerVariables = [];
    const bodyVariables = [];
    const buttonVariables = [];

    setTemplateMessage("");

    contentBlocks.forEach((block) => {
      switch (block.type) {
        case "HEADER":
          if (block.format === "TEXT" && block.text) {
            headerVariables.push(...extractVariables(block.text));
          }
          break;

        case "BODY":
          if (block.text) {
            bodyVariables.push(...extractVariables(block.text));
            setTemplateMessage(block.text);
          }
          break;

        case "BUTTONS":
          setButtons(block.buttons || []);
          if (block.buttons) {
            block.buttons.forEach((btn) => {
              if (btn.text) {
                buttonVariables.push(btn.text); // ✅ treat button text like body vars
              }
            });
          }
          break;
      }
    });

    setTemplateVariables({
      header: [...new Set(headerVariables)],
      body: [...new Set(bodyVariables)],
      buttons: [...new Set(buttonVariables)],
    });

    // Initialize variable settings
    const newSettings = {};
    [...headerVariables, ...bodyVariables, ...buttonVariables].forEach(
      (variable) => {
        if (!newSettings[variable]) {
          const matchingMappingVar = mappingVariables.find(
            (mv) =>
              mv.variable_name === variable ||
              mv.variable_name === `{{${variable}}}`
          );
          const matchedvab = matchingMapVab.find(
            (mv) =>
              mv.variable_name === variable ||
              mv.variable_name === `{{${variable}}}`
          );

          if (matchedvab != undefined) {
            newSettings[variable] = {
              dropdown:
                matchedvab?.mapping_field ||
                variableSettings[variable]?.dropdown ||
                "Name",
              fallback:
                matchedvab?.fallback_value ||
                variableSettings[variable]?.fallback ||
                "",
            };
          } else {
            newSettings[variable] = {
              dropdown:
                matchingMappingVar?.mapping_field ||
                variableSettings[variable]?.dropdown ||
                "Name",
              fallback:
                matchingMappingVar?.fallback_value ||
                variableSettings[variable]?.fallback ||
                "",
            };
          }

          console.log("section to remove ::::::", currentWorkflowData);
        }
      }
    );
    setVariableSettings(newSettings);
  };

  // Extract variables from text using regex
  const extractVariables = (text) => {
    if (!text) return [];
    const regex = /\{\{([^}]+)\}\}/g;
    const variables = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      variables.push(match[1].trim());
    }
    return variables;
  };

  // Add these state variables to your component
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncProgress, setSyncProgress] = useState("");

  // Optimized sync function with better error handling and progress feedback
  const handleSyncTemplates = async () => {
    try {
      setLoading(true);
      setSyncProgress("Initializing sync...");

      const storeToken = localStorage.getItem("storeToken");

      // Use cached store data if available, or fetch it
      let storeData = null;

      try {
        setSyncProgress("Fetching store configuration...");
        const storeResponse = await fetch(`/api/store-phone`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ storeToken }),
        });

        if (!storeResponse.ok) {
          throw new Error("Failed to fetch store data");
        }

        storeData = await storeResponse.json();

        if (!storeData.waba_id || !storeData.phonenumber) {
          throw new Error(
            "Store missing waba_id or phonenumber. Please configure store settings first."
          );
        }
      } catch (error) {
        throw new Error(`Store configuration error: ${error.message}`);
      }

      // Call optimized sync API
      setSyncProgress("Syncing templates from WhatsApp...");

      const syncResponse = await fetch("/api/sync-template", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeToken: storeToken,
          waba_id: storeData.waba_id,
          phonenumber: storeData.phonenumber,
        }),
        signal: AbortSignal.timeout(30000), // 30 second timeout for sync
      });

      const result = await syncResponse.json();

      if (result.success) {
        setSyncProgress("Updating local cache...");

        // Success feedback with details
        success(`Templates synced Successfully! `);

        // Reload template data with optimized approach
        await reloadTemplateDataOptimized();

        setSyncProgress("Sync completed successfully!");

        // Clear progress after delay
        setTimeout(() => setSyncProgress(""), 2000);
      } else {
        throw new Error(result.message || "Failed to sync templates");
      }
    } catch (error) {
      console.error("Template sync error:", error);

      // Better error messages based on error type
      let errorMessage = "Failed to sync templates";

      if (error.name === "AbortError") {
        errorMessage = "Sync request timed out. Please try again.";
      } else if (error.message.includes("fetch")) {
        errorMessage = "Network error. Please check your connection.";
      } else {
        errorMessage = `Sync failed: ${error.message}`;
      }

      error(errorMessage);
      setSyncProgress("");
    } finally {
      setLoading(false);
    }
  };

  // Optimized template data reload
  const reloadTemplateDataOptimized = async () => {
    try {
      const storeToken = localStorage.getItem("storeToken");

      const templateResponse = await fetch(
        `/api/template-data?storeToken=${storeToken}`,
        {
          signal: AbortSignal.timeout(10000),
          headers: {
            "Cache-Control": "no-cache", // Force fresh data
          },
        }
      );

      if (templateResponse.ok) {
        const templateData = await templateResponse.json();

        if (templateData.templates?.length > 0) {
          // Update template options
          const newTemplateNames = templateData.templates.map(
            (t) => t.template_name
          );
          setTemplateOptions(newTemplateNames);
          setAllTemplatesData(templateData.templates);

          // Preserve current selection if it still exists, otherwise select first
          const currentTemplateExists =
            newTemplateNames.includes(selectedTemplate);
          if (!currentTemplateExists && newTemplateNames.length > 0) {
            setSelectedTemplate(newTemplateNames[0]);
          }

          console.log(`Reloaded ${templateData.templates.length} templates`);
        }
      }
    } catch (error) {
      console.error("Failed to reload template data:", error);
      // Don't show error to user for this background operation
    }
  };

  useEffect(() => {
    window.addEventListener("resize", checkDropdownPosition);
    checkDropdownPosition();
    return () => window.removeEventListener("resize", checkDropdownPosition);
  }, []);

  const updateVariableSetting = (variable, field, value) => {
    setVariableSettings((prev) => ({
      ...prev,
      [variable]: {
        ...prev[variable],
        [field]: value,
      },
    }));
  };

  const handleUpdateWorkflow = async () => {
    try {
      setLoading1(true);

      let selectedTemplateObj;
      let templateDataObj = null;
      let allTemplateVariableIds = [];

      // call this upload if media existeing

      if (!currentWorkflowData) {
        error("Workflow data not found");
        return;
      }

      // Validate fallback values for all variables
      const allVariables = [
        ...templateVariables.header,
        ...templateVariables.body,
      ];

      const missingFallbacks = [];

      for (const variable of allVariables) {
        const fallbackValue = variableSettings[variable]?.fallback;
        if (!fallbackValue || fallbackValue.trim() === "") {
          missingFallbacks.push(variable);
        }
      }

      if (missingFallbacks.length > 0) {
        setLoading1(false);
        error(
          `Please provide fallback values for the following variables: ${missingFallbacks
            .map((v) => `{{${v}}}`)
            .join(", ")}`
        );
        return;
      }

      const storeToken = localStorage.getItem("storeToken");

      // Use category-specific data if available, otherwise use general template data
      if (selectedTemplateData && selectedTemplateData.hasSpecificData) {
        console.log("Using category-specific data for update");
        selectedTemplateObj = selectedTemplateData;
        templateDataObj = selectedTemplateData?.data;

        if (selectedTemplateData.template_variable_id) {
          const variableIds = selectedTemplateData.template_variable_id
            .toString()
            .split(",");
          allTemplateVariableIds = variableIds.filter((id) => id && id.trim());
        }
      } else {
        console.log("Using general template data for update");
        selectedTemplateObj = allTemplatesData.find(
          (template) => template.template_name === selectedTemplate
        );

        if (!selectedTemplateObj) {
          error("Selected template not found");
          setLoading1(false);
          return;
        }

        templateDataObj = selectedTemplateObj?.data?.[0];

        if (templateDataObj) {
          if (
            templateDataObj.componentVariables &&
            Array.isArray(templateDataObj.componentVariables)
          ) {
            const componentIds = templateDataObj.componentVariables
              .map((v) => v.template_variable_id)
              .filter((id) => id != null);
            allTemplateVariableIds.push(...componentIds);
          }

          if (
            templateDataObj.mappingVariables &&
            Array.isArray(templateDataObj.mappingVariables)
          ) {
            const mappingIds = templateDataObj.mappingVariables
              .map((v) => v.template_variable_id)
              .filter((id) => id != null);
            allTemplateVariableIds.push(...mappingIds);
          }
        }
      }

      const uniqueVariableIds = [...new Set(allTemplateVariableIds)];
      const templateVariableIdsString =
        uniqueVariableIds.length > 0 ? uniqueVariableIds.join(",") : null;

      const updateData = {
        storeToken: storeToken,
        category_id: currentWorkflowData.category_id,
        category_event_id: currentWorkflowData.category_event_id,
        delay: selectedDelay,
        template: selectedTemplate,
        variableSettings: variableSettings,
        template_id: selectedTemplateObj.template_id,
        template_data_id:
          templateDataObj?.template_data_id ||
          selectedTemplateData?.template_data_id,
        template_variable_id: templateVariableIdsString,
      };

      console.log("Updating workflow with data:", updateData);

      const formData = new FormData();

      formData.append(
        "temp_id",
        templateDataObj?.template_data_id ||
          selectedTemplateData?.template_data_id
      );

      formData.append("file", file);

      const uploadResponse = await POST("/upload-media-image", formData, true);

      const response = await fetch("/api/category", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        success("Workflow updated successfully!");
        router.push("/workflowlist");
        setLoading1(false);
      } else {
        throw new Error(result.message || "Failed to update workflow");
      }
      setLoading1(false);
    } catch (error) {
      console.error("Error updating workflow:", error);
      error(`Failed to update workflow: ${error.message}`);
      setLoading1(false);
    }
  };

  const buttonRef = useRef(null);

  // Rest of your component code remains the same...
  const renderVariableRow = (variable, section) => (
    <div
      key={`${section}-${variable}`}
      className="flex flex-wrap items-center mb-[16px] gap-3 sm:gap-[20px]"
    >
      <span className="text-[#333333] text-[14px] w-full sm:w-36">
        {`{{${variable}}}`}
      </span>

      <Listbox
        value={variableSettings[variable]?.dropdown || "Name"}
        onChange={(value) => updateVariableSetting(variable, "dropdown", value)}
      >
        <div className="relative w-full sm:w-48">
          <Listbox.Button
            ref={buttonRef}
            onClick={() => checkDropdownDirection(variable, buttonRef.current)}
            className="relative w-full cursor-default rounded-[4px] border border-[#E4E4E4] bg-white py-[10px] px-[16px] text-left text-[14px] text-[#333333] focus:outline-none"
          >
            {variableSettings[variable]?.dropdown || "Name"}
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center mr-[10px]">
              <FiChevronDown className="h-[20px] w-[20px] text-[#999999]" />
            </span>
          </Listbox.Button>

          <Listbox.Options
            className={`absolute max-h-60 w-full overflow-auto rounded-[4px] bg-white py-1 px-0.5 text-sm text-[#333] shadow-lg ring-1 ring-[#E9E9E9] ring-opacity-5 focus:outline-none z-50 ${
              dropdownDirection[variable] === "up"
                ? "bottom-full mb-1"
                : "top-full mt-1"
            }`}
          >
            {mappingFieldOptions.map((option, idx) => (
              <Listbox.Option
                key={idx}
                className={({ active }) =>
                  `cursor-default select-none py-2 pl-4 pr-4 ${
                    active ? "bg-gray-100" : ""
                  }`
                }
                value={option}
              >
                {option}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </div>
      </Listbox>

      {section !== "buttons" && (
        <input
          type="text"
          placeholder="Fallback value"
          value={variableSettings[variable]?.fallback || ""}
          onChange={(e) =>
            updateVariableSetting(variable, "fallback", e.target.value)
          }
          className="border border-[#E4E4E4] rounded-[4px] px-[16px] py-[10px] text-[14px] text-[#999999] w-full sm:flex-1"
        />
      )}
    </div>
  );

  const delayOptions = [
    "15 minutes",
    "30 minutes",
    "1 hour",
    "6 hours",
    "12 hours",
    "24 hours",
  ];

  // Helper function to get template content blocks
  const getTemplateContentBlocks = () => {
    if (!selectedTemplate || allTemplatesData.length === 0) return [];

    if (
      selectedTemplateData &&
      selectedTemplateData.hasSpecificData &&
      selectedTemplateData?.data?.content
    ) {
      return selectedTemplateData?.data.content;
    }

    const template = allTemplatesData.find(
      (t) => t.template_name === selectedTemplate
    );

    if (!template) return [];

    if (template?.data && Array.isArray(template?.data)) {
      return template?.data[0]?.content || [];
    } else if (template?.data?.content) {
      return template?.data.content;
    }

    return [];
  };

  // In your Editflow component, update the handleSendTestMessage function:

  const handleSendTestMessage = async () => {
    if (!testPhoneNumber.trim()) {
      error("Please enter a phone number");
      return;
    }

    if (!currentWorkflowData?.category_event_id) {
      error("Category event ID not found");
      return;
    }

    // ✅ VALIDATE FALLBACK VALUES BEFORE SENDING
    const allVariables = [
      ...templateVariables.header,
      ...templateVariables.body,
    ];

    const missingFallbacks = [];
    const fallbackValues = {};

    for (const variable of allVariables) {
      const fallbackValue = variableSettings[variable]?.fallback;
      if (!fallbackValue || fallbackValue.trim() === "") {
        missingFallbacks.push(variable);
      } else {
        fallbackValues[variable] = fallbackValue.trim();
      }
    }

    if (missingFallbacks.length > 0) {
      error(
        `Please provide fallback values for the following variables: ${missingFallbacks
          .map((v) => `{{${v}}}`)
          .join(", ")}`
      );
      return;
    }

    try {
      setTestLoading(true);

      const storeToken = localStorage.getItem("storeToken");

      // ✅ SEND USER-ENTERED FALLBACK VALUES IN REQUEST
      const testPayload = {
        category_event_id: currentWorkflowData.category_event_id,
        phonenumber: testPhoneNumber.trim(),
        fallbackValues: fallbackValues, // ✅ Send user-entered fallback values
        variableSettings: variableSettings,
        selectedTemplate: selectedTemplate,
        storeToken: storeToken, // ✅ Send complete variable settings
      };

      console.log("Sending test message with payload:", testPayload);

      const response = await fetch("/api/test-template", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testPayload),
      });

      const result = await response.json();

      if (response.ok && result.status === "success") {
        success(`Test message sent successfully to ${testPhoneNumber}`);
        setShowTestPopup(false);
        setTestPhoneNumber("");
      } else {
        throw new Error(result.message || "Failed to send test message");
      }
    } catch (err) {
      console.error("Test message error:", err);
      error(`Failed to send test message: ${err.message}`);
    } finally {
      setTestLoading(false);
    }
  };

  // ✅ ALSO UPDATE THE TestMessagePopup COMPONENT VALIDATION
  const TestMessagePopup = ({
    showTestPopup,
    setShowTestPopup,
    testPhoneNumber,
    setTestPhoneNumber,
    testLoading,
    handleSendTestMessage,
    selectedTemplate,
    currentWorkflowData, // ✅ Added as prop
  }) => {
    if (!showTestPopup) return null;

    // ✅ Check if phone number is valid
    const isPhoneNumberComplete = testPhoneNumber.length === 10;

    // ✅ Validate fallback values
    const allVariables = [
      ...templateVariables.header,
      ...templateVariables.body,
    ];

    const missingFallbacks = [];

    for (const variable of allVariables) {
      const fallbackValue = variableSettings[variable]?.fallback;
      if (!fallbackValue || fallbackValue.trim() === "") {
        missingFallbacks.push(variable);
      }
    }

    // ✅ Handle backdrop click
    const handleBackdropClick = () => {
      setShowTestPopup(false);
    };

    // ✅ Handle Escape key press
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowTestPopup(false);
      }
    };

    // ✅ Handle close button and cancel click with validation
    const handleCloseAttempt = () => {
      if (testPhoneNumber.length === 0 || isPhoneNumberComplete) {
        setShowTestPopup(false);
      }
    };

    // ✅ Show fallback warning popup if values are missing
    if (missingFallbacks.length > 0) {
      return (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
          onClick={() => setShowTestPopup(false)}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Missing Fallback Values
              </h3>
              <button
                onClick={() => setShowTestPopup(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">
                    Please provide fallback values for the following variables
                    before testing:
                  </p>
                  <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                    {missingFallbacks.map((variable) => (
                      <li key={variable}>{`{{${variable}}}`}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowTestPopup(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Go Back and Add Fallback Values
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className="fixed inset-0 flex items-center justify-center z-50"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
        onClick={handleBackdropClick}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <div
          className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Send Test Message
            </h3>
            <button
              onClick={handleCloseAttempt}
              className={`text-gray-400 hover:text-gray-600 transition-colors ${
                !isPhoneNumberComplete && testPhoneNumber.length > 0
                  ? "opacity-50 cursor-not-allowed hover:text-gray-400"
                  : ""
              }`}
              disabled={!isPhoneNumberComplete && testPhoneNumber.length > 0}
              title={
                !isPhoneNumberComplete && testPhoneNumber.length > 0
                  ? "Please complete the 10-digit phone number first"
                  : "Close"
              }
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number<span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={testPhoneNumber}
              onChange={(e) => {
                const value = e.target.value;
                if (/^\d*$/.test(value) && value.length <= 10) {
                  setTestPhoneNumber(value);
                }
              }}
              placeholder="Enter phone number (e.g., 9876543210)"
              className={`w-full px-3 py-2 text-black bg-white border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                testPhoneNumber.length > 0 && testPhoneNumber.length < 10
                  ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                  : "border-gray-300"
              }`}
              maxLength={10}
              autoFocus
              required
            />
            <div className="flex justify-between items-center mt-1">
              <p
                className={`text-xs ${
                  testPhoneNumber.length > 0 && testPhoneNumber.length < 10
                    ? "text-red-500"
                    : "text-gray-500"
                }`}
              >
                {testPhoneNumber.length > 0 && testPhoneNumber.length < 10
                  ? `Please enter all 10 digits (${testPhoneNumber.length}/10)`
                  : "Enter phone number without country code (10 digits required)"}
              </p>
              <span
                className={`text-xs font-medium ${
                  testPhoneNumber.length === 10
                    ? "text-green-600"
                    : testPhoneNumber.length > 0
                    ? "text-red-500"
                    : "text-gray-400"
                }`}
              >
                {testPhoneNumber.length}/10
              </span>
            </div>
          </div>

          {/* Warning */}
          {testPhoneNumber.length > 0 && testPhoneNumber.length < 10 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-800">
                    Please complete the 10-digit phone number before proceeding.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Template Info */}
          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Template:</span>{" "}
              {selectedTemplate || "None selected"}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Workflow:</span>{" "}
              {currentWorkflowData?.title || "Unknown"}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleCloseAttempt}
              className={`px-4 py-2 border border-gray-300 rounded-md transition-colors ${
                !isPhoneNumberComplete && testPhoneNumber.length > 0
                  ? "text-gray-400 bg-gray-100 cursor-not-allowed opacity-50"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
              disabled={!isPhoneNumberComplete && testPhoneNumber.length > 0}
              title={
                !isPhoneNumberComplete && testPhoneNumber.length > 0
                  ? "Complete the phone number to cancel"
                  : "Cancel"
              }
            >
              Cancel
            </button>
            <button
              onClick={handleSendTestMessage}
              disabled={testLoading || !isPhoneNumberComplete}
              className={`px-4 py-2 rounded-md flex items-center space-x-2 transition-colors ${
                testLoading || !isPhoneNumberComplete
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
              title={
                !isPhoneNumberComplete
                  ? "Enter complete 10-digit phone number to send"
                  : "Send test message"
              }
            >
              {testLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>{testLoading ? "Sending..." : "Send Message"}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="font-source-sans flex flex-col min-h-screen">
        <DashboardHeaader />
        <div className="p-[16px] flex flex-1 bg-[#E9E9E9]">
          <Sidebar active={activeTab} onChange={setActiveTab} />
          <main className="flex-1 bg-white border-l border-[#E9E9E9] flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading templates...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.size <= 5 * 1024 * 1024) {
      setFile(selectedFile);
    } else {
      alert("File must be JPG, JPEG, PNG and within 5MB");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.size <= 5 * 1024 * 1024) {
      setFile(droppedFile);
    } else {
      alert("File must be JPG, JPEG, PNG and within 5MB");
    }
  };

  const delteTemImage = async (id) => {
    console.log(id, "id");
    const data = {
      id: id,
    };
    const uploadResponse = await POST("/delete-team-image", data);

    console.log(uploadResponse, "uploadResponse");
    if (uploadResponse.success === true) {
      success(uploadResponse.message);
      loadAllData();
    } else {
      error(uploadResponse.message);
    }
  };

  const variable = categoryTemplateData?.data[0]?.variables[0];

  const hasImage =
    variable?.tamplate_image && variable?.tamplate_image.trim() !== "";

  console.log(categoryTemplateData, "categoryTemplateData");
  console.log(hasImage, "hasImage");

  const SaveTemplate = () => {
    alert("Template saved successfully!");
    closeModal();
  };
  const CancelTemplate = () => {
    setFallbacks({});
    setVariables([]);
    setCustomTemplateData({
      templateName: "",
      body: "",
      buttonText: "",
      buttonText2: "", // if second button is conditionally shown
    });
    closeModal();
  };

  return (
    <>
      <div className="font-source-sans flex flex-col min-h-screen">
        <DashboardHeaader />
        <div className="p-[16px] flex flex-col md:flex-row flex-1 bg-[#E9E9E9]">
          <Sidebar active={activeTab} onChange={setActiveTab} />
          <main className="flex-1 bg-white border-l border-[#E9E9E9]">
            {/* Top Bar */}
            <div className="flex items-center justify-between border-b border-[#E9E9E9] px-[32px] py-[24px]">
              <div className="flex items-center gap-[12px]">
                <Image
                  src="/assets/back.svg"
                  alt="back"
                  height={24}
                  width={24}
                  className="max-h-[24px] max-w-[24px] cursor-pointer"
                  onClick={() => router.push("/workflowlist")}
                />
                <div>
                  <h2 className="text-[16px] font-semibold text-[#353535]">
                    Edit workflow
                  </h2>
                </div>
                <div>
                  <p className="text-[16px] font-semibold text-[#353535]">
                    ({currentWorkflowData?.title})
                  </p>
                </div>
              </div>
              {/* <button
                onClick={openModal}
                className="px-[24px] py-[10px] bg-[#343E55] rounded-[4px] text-[#FFFFFF] text-[14px] font-semibold hover:bg-[#1f2a44]"
              >
                Add New Template
              </button> */}
            </div>

            {/* Content Section */}
            <div className="flex flex-col lg:flex-row">
              {/* Form Section */}
              <div className="md:w-full lg:w-2/3 mx-[10px] md:mx-[32px] mt-[24px]">
                <div className="flex flex-col md:flex-row gap-[24px]">
                  {/* Delay Dropdown */}
                  {/* Delay Dropdown - Only show for Abandoned Cart Recovery */}
                  {(currentWorkflowData?.title === "Reminder 1" ||
                    currentWorkflowData?.title === "Reminder 2" ||
                    currentWorkflowData?.title === "Reminder 3" ||
                    currentWorkflowData?.title === "Reorder Reminder" ||
                    currentWorkflowData?.title === "Order Feedback") && (
                    <div className="flex-1">
                      <label className="block text-[12px] text-[#555555] mb-[4px]">
                        Delay
                      </label>
                      <Listbox
                        value={selectedDelay}
                        onChange={setSelectedDelay}
                      >
                        <div className="relative">
                          <Listbox.Button className="relative w-full cursor-default rounded-[4px] border border-[#E9E9E9] bg-white py-[10px] px-[16px] text-left text-[14px] text-[#333333] focus:outline-none">
                            {selectedDelay}
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                              <FiChevronDown className="h-5 w-5 text-gray-400" />
                            </span>
                          </Listbox.Button>
                          <Listbox.Options className="absolute max-h-60 w-full overflow-auto rounded-[4px] bg-white py-[4px] px-[2px] text-[14px] text-[#333] shadow-lg ring-1 ring-[#E9E9E9] ring-opacity-5 focus:outline-none z-10">
                            {delayOptions.map((delay, idx) => (
                              <Listbox.Option
                                key={idx}
                                className={({ active }) =>
                                  `cursor-default select-none py-2 pl-4 pr-4 ${
                                    active ? "bg-gray-100" : ""
                                  }`
                                }
                                value={delay}
                              >
                                {delay}
                              </Listbox.Option>
                            ))}
                          </Listbox.Options>
                        </div>
                      </Listbox>
                    </div>
                  )}

                  {/* Template Dropdown */}
                  {/* Template Dropdown with Sync Button */}
                  <div className="flex-1 relative">
                    <label className="block text-[12px] text-[#555555] mb-[4px]">
                      Select WhatsApp template
                    </label>
                    <Listbox
                      value={selectedTemplate}
                      onChange={setSelectedTemplate}
                    >
                      <div className="relative">
                        <Listbox.Button className="relative w-full cursor-default rounded-[4px] border border-[#E9E9E9] bg-white py-[10px] px-[16px] text-left text-[14px] text-[#333333] focus:outline-none">
                          {selectedTemplate || "Select a template"}
                          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <FiChevronDown className="h-5 w-5 text-gray-400" />
                          </span>
                        </Listbox.Button>
                        <Listbox.Options className="absolute max-h-60 w-full overflow-auto rounded-[4px] bg-white py-[4px] px-[2px] text-[14px] text-[#333] shadow-lg ring-1 ring-[#E9E9E9] ring-opacity-5 focus:outline-none z-10">
                          {templateOptions.map((template, idx) => (
                            <Listbox.Option
                              key={idx}
                              className={({ active }) =>
                                `cursor-default select-none py-2 pl-4 pr-4 ${
                                  active ? "bg-gray-100" : ""
                                }`
                              }
                              value={template}
                            >
                              {template}
                            </Listbox.Option>
                          ))}
                        </Listbox.Options>
                      </div>
                    </Listbox>

                    {/* Sync Button in top-right */}
                    <button
                      onClick={handleSyncTemplates}
                      className="absolute top-[1px] right-[1px] text-[#4275D6] text-[12px] hover:text-[#345bb3] transition"
                    >
                      ⟳ Sync Template
                    </button>
                  </div>
                </div>

                {/* Template Variables Section */}
                <div className="flex mt-[32px]">
                  <div className="w-full">
                    <h2 className="text-[16px] font-semibold text-[#333333] mb-[20px]">
                      Mapping template variables & upload media
                    </h2>

                    {/* Tabs */}
                    <div className="flex space-x-[32px]">
                      <button
                        onClick={() => setActivePart("template")}
                        className={`text-[14px] text-[#343E55] cursor-pointer font-medium pb-[4px] ${
                          activePart === "template"
                            ? "border-b-2 border-[#343E55]"
                            : "text-[#999999]"
                        }`}
                      >
                        Template variables
                      </button>
                      <button
                        onClick={() => setActivePart("media")}
                        className={`text-[14px] text-[#343E55] cursor-pointer font-medium pb-[4px] ${
                          activePart === "media"
                            ? "border-b-2 border-[#343E55]"
                            : "text-[#999999]"
                        }`}
                      >
                        Media
                      </button>
                    </div>

                    {/* Template Variables Tab */}
                    {activePart === "template" && (
                      <div className="mt-[20px]">
                        {/* Header Variables */}
                        {templateVariables.header.length > 0 && (
                          <div className="mb-[24px]">
                            <h3 className="text-[14px] font-semibold text-[#848688] mb-[6px]">
                              Header
                            </h3>
                            {templateVariables.header.map((variable) =>
                              renderVariableRow(variable, "header")
                            )}
                          </div>
                        )}

                        {/* Body Variables */}
                        {templateVariables.body.length > 0 && (
                          <div className="mb-[24px]">
                            <h3 className="text-[14px] font-semibold text-[#848688] mb-[6px]">
                              Body variables
                            </h3>
                            {templateVariables.body.map((variable) =>
                              renderVariableRow(variable, "body")
                            )}
                          </div>
                        )}

                        {/* Button Variables */}
                        {templateVariables.buttons.length > 0 && (
                          <div className="mb-[24px]">
                            <h3 className="text-[14px] font-semibold text-[#848688] mb-[6px]">
                              Button
                            </h3>
                            {templateVariables.buttons.map((variable) =>
                              renderVariableRow(variable, "buttons")
                            )}
                          </div>
                        )}

                        {/* No Variables Message */}
                        {templateVariables.header.length === 0 &&
                          templateVariables.body.length === 0 &&
                          templateVariables.buttons.length === 0 && (
                            <div className="text-center py-[40px] text-[#999999]">
                              <p>
                                No template variables found in the selected
                                template.
                              </p>
                            </div>
                          )}
                      </div>
                    )}

                    {/* Media Tab */}
                    {activePart === "media" && (
                      <div className="mt-[20px]">
                        {hasImage ? (
                          // ✅ Image already uploaded
                          <div className="border-2 border-dashed bg-[#F3F5F699] border-[#E4E4E4] rounded-[8px] py-[14px] px-[14px] text-center text-gray-500 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <h2>Image is already uploaded</h2>
                            </div>
                            <button
                              onClick={() =>
                                delteTemImage(
                                  categoryTemplateData?.data[0]?.variables[0]
                                    .template_variable_id
                                )
                              }
                            >
                              <Image
                                src={`/assets/dlt.svg`}
                                alt="Delete"
                                width={20}
                                height={20}
                                className="rounded-[6px]"
                              />
                            </button>
                          </div>
                        ) : (
                          // ✅ Upload new image (drag & drop)
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              setDragActive(true);
                            }}
                            onDragLeave={() => setDragActive(false)}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-[8px] py-[14px] px-[32px] text-center transition ${
                              dragActive
                                ? "border-blue-500 bg-blue-50"
                                : "border-[#E4E4E4] bg-[#F3F5F699]"
                            }`}
                          >
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png"
                              onChange={handleFileChange}
                              className="hidden"
                              id="fileUpload"
                            />
                            <label
                              htmlFor="fileUpload"
                              className="cursor-pointer px-[24px] mb-[8px] py-[10px] inline-block text-[#343E55] text-[14px] font-semibold bg-[#FFFFFF] border border-[#E4E4E4] rounded-[4px]"
                            >
                              Upload from device
                            </label>

                            <p className="text-[12px] text-[#555555] mb-[6px]">
                              Or drag and drop file here
                            </p>
                            <p className="text-[12px] text-[#999999]">
                              Supported file types: .JPG, .JPEG, .PNG within 5MB
                            </p>

                            {file && (
                              <p className="mt-2 text-[13px] text-green-600">
                                ✅ {file.name} uploaded
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-between items-center mt-[32px] mb-[20px]">
                      {/* Note aligned to start */}
                      <p className="text-red-600 text-[12px]">
                        {note.split("\n").map((line, index) => (
                          <React.Fragment key={index}>
                            {line}
                            <br />
                          </React.Fragment>
                        ))}
                      </p>

                      {/* Buttons aligned to end */}
                      <div className="flex space-x-[16px]">
                        <button
                          onClick={() => setShowTestPopup(true)}
                          className="px-[24px] py-[10px] border border-[#E4E4E4] rounded-[4px] text-[#343E55] text-[14px] font-semibold hover:bg-gray-100"
                        >
                          Test
                        </button>
                        <button
                          onClick={() => router.push("/workflowlist")}
                          className="px-[24px] py-[10px] border border-[#E4E4E4] rounded-[4px] text-[#343E55] text-[14px] font-semibold hover:bg-gray-100"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleUpdateWorkflow}
                          className="px-[24px] py-[10px] bg-[#343E55] rounded-[4px] text-[#FFFFFF] text-[14px] font-semibold hover:bg-[#1f2a44]"
                        >
                          {loading1 ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
                          ) : (
                            "Update workflow"
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Preview */}
              <div className="flex justify-center items-center flex-grow bg-[#E8F1FC] min-h-[83.65vh]">
                <div className="h-[571px] w-[317px] my-[20px] mx-[32px] flex-shrink-0 rounded-[20px] overflow-hidden flex flex-col border border-[#E4E4E4] bg-white">
                  {/* Chat Header */}
                  <div className="bg-[#2A2F4F] flex items-center py-[16px] px-[20px] text-white">
                    <Image
                      src="/assets/back.svg"
                      alt="back btn"
                      height={100}
                      width={100}
                      className="max-h-[14px] max-w-[14px] invert brightness-200 mr-[10px] cursor-pointer"
                    />
                    <Image
                      src="/assets/wp_icon.svg"
                      alt="wp icon"
                      height={100}
                      width={100}
                      className="max-h-[21px] max-w-[21px] mr-[4px]"
                    />
                    <h1 className="font-semibold text-[#FFFFFF] text-[18px]">
                      MyOperator
                    </h1>
                    <div className="ml-auto">
                      <Image
                        src="/assets/more_info.svg"
                        alt="more info"
                        height={100}
                        width={100}
                        className="max-h-[15px] max-w-[4px] cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Chat Body */}
                  <div className="flex-1 bg-[url('/assets/wp_bg.svg')] bg-repeat px-[15px] pt-[15px] overflow-y-auto no-scrollbar">
                    <div className="bg-white rounded-[4px] px-[16px] pt-[16px] text-[14px] text-[#1A1A1A] space-y-3">
                      {hasImage && (
                        <div className="border-2 border-dashed bg-[#F3F5F699] border-[#E4E4E4] rounded-[8px] py-[14px] px-[14px] text-center text-gray-500 flex justify-between items-center">
                          <h2>Image is already uploaded</h2>
                        </div>
                      )}

                      {/* Body Text */}
                      {(() => {
                        console.log(
                          "Template message for display:",
                          templateMessage
                        );
                        const contentBlocks = getTemplateContentBlocks();
                        console.log("content block:::", contentBlocks);

                        if (templateMessage) {
                          return (
                            <div>
                              {templateMessage.split("\n").map((line, idx) => (
                                <p
                                  key={idx}
                                  style={{
                                    fontFamily: "sans-serif",
                                    lineHeight: "1.4",
                                  }}
                                >
                                  {line}
                                  <br />
                                </p>
                              ))}
                            </div>
                          );
                        }

                        // If no templateMessage, try to get it directly from content blocks

                        console.log("content block:::", contentBlocks);

                        const bodyBlock = contentBlocks.find(
                          (block) => block.type === "BODY"
                        );
                        console.log("Body block found:", bodyBlock);

                        if (bodyBlock?.text) {
                          return (
                            <div>
                              {bodyBlock.text.split("\n").map((line, idx) => (
                                <p
                                  key={idx}
                                  style={{
                                    fontFamily: "sans-serif",
                                    lineHeight: "1.4",
                                  }}
                                >
                                  {line}
                                  <br />
                                </p>
                              ))}
                            </div>
                          );
                        }

                        return null;
                      })()}

                      <p className="text-[12px] bg-white text-right text-[#999999] pr-2">
                        2:29
                      </p>

                      {/* Button */}
                      <div className="">
                        {(() => {
                          const contentBlocks = getTemplateContentBlocks();
                          const buttonBlock = contentBlocks.find(
                            (block) => block.type === "BUTTONS"
                          );

                          if (buttonBlock && buttonBlock.buttons?.length > 0) {
                            return (
                              <div className="text-center">
                                {buttonBlock.buttons.map((btn, idx) => (
                                  <button
                                    key={idx}
                                    className="text-[#4275D6] w-full border-t border-[#E9E9E9] text-[14px] font-medium px-4 py-3"
                                  >
                                    {btn.text || "Click here"}
                                  </button>
                                ))}
                              </div>
                            );
                          }

                          return null;
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Chat Input */}
                  <div className="flex items-center bg-[url('/assets/wp_bg.svg')] bg-repeat overflow-y-hidden py-[9px] px-[4px]">
                    <Image
                      src="/assets/Emoji.svg"
                      alt="wp emoji"
                      height={100}
                      width={100}
                      className="max-h-[16px] max-w-[16px] absolute ml-[12px] cursor-pointer"
                    />
                    <input
                      type="text"
                      placeholder="Message"
                      className="flex-1 py-[10px] bg-white text-[#8798A0] pr-[60px] pl-[38px] rounded-[20px] border border-[#E4E4E4] outline-none text-[14px]"
                    />
                    <Image
                      src="/assets/wp_upload.svg"
                      alt="wp emoji"
                      height={100}
                      width={100}
                      className="max-h-[21px] max-w-[21px] z-20 absolute ml-[195px] md:ml-[180px] cursor-pointer"
                    />
                    <Image
                      src="/assets/wp_camera.svg"
                      alt="wp emoji"
                      height={100}
                      width={100}
                      className="max-h-[16px] max-w-[16px] z-20 absolute ml-[225px] md:ml-[210px] cursor-pointer"
                    />
                    <Image
                      src="/assets/mic.svg"
                      alt="wp emoji"
                      height={100}
                      width={100}
                      className="max-h-[40px] max-w-[40px] bg-[#343E55] ml-[11px] p-[9px] rounded-full cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
      <CustomModal
        isOpen={isOpen}
        closeModal={closeModal}
        title="Add New Template"
      >
        <div>
          {/* Header Section */}
          <div className="my-3">
            <h3 className="font-medium mb-2">Template Name </h3>
            <div className="flex gap-4">
              <input
                type="text"
                name="templateName" // ✅ important
                value={customTemplateData.templateName}
                onChange={handleChange}
                placeholder="e.g. Order Confirmation Template"
                className="w-full border rounded-md p-2 text-sm focus:outline-blue-500"
              />
            </div>
          </div>
          {/* Body */}
          <div>
            <div className="my-3">
              <h3 className="font-medium mb-2">
                Body <span className="text-red-500">*</span>
              </h3>
              <textarea
                name="body"
                value={customTemplateData.body}
                onChange={handleChange}
                placeholder="Hello {{name}}, Enjoy an exclusive 20% discount on your next purchase with us!"
                className="w-full border rounded-md p-3 text-sm focus:outline-blue-500"
                rows={5}
                maxLength={1024}
              />
              <div className="text-right text-xs text-gray-500">
                {customTemplateData.body.length}/1024
              </div>
            </div>

            {/* Dynamic Variable Inputs */}
            {variables.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">
                  Fallback Values for Variables
                </h4>
                {variables.map((variable) => (
                  <div key={variable} className="mb-2">
                    <label className="block text-sm font-medium mb-1">
                      {variable} Fallback
                    </label>
                    <input
                      type="text"
                      value={fallbacks[variable] || ""}
                      onChange={(e) =>
                        handleFallbackChange(variable, e.target.value)
                      }
                      placeholder={`Enter fallback for ${variable}`}
                      className="w-full border rounded-md p-2 text-sm focus:outline-blue-500"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Buttons Section */}
          <div className="my-3">
            <h3 className="font-medium mb-2">Enter Redirection button</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* First button */}
              <div className="relative w-full">
                <label className="text-xs text-gray-500 mb-2">
                  Button Text
                </label>
                <input
                  type="text"
                  name="buttonText"
                  value={customTemplateData.buttonText}
                  onChange={handleChange}
                  placeholder="e.g. Visit our website"
                  maxLength={25}
                  className="w-full border rounded-md p-2 pr-12 text-sm focus:outline-blue-500"
                />
                <div className="text-right text-xs text-gray-500">
                  {customTemplateData.buttonText.length}/25
                </div>
              </div>

              {/* Conditionally render second button */}
              {currentWorkflowData?.title ===
                "COD Order Confirmation or Cancel" && (
                <div className="relative w-full">
                  <label className="text-xs text-gray-500 mb-2">
                    Button Text
                  </label>
                  <input
                    type="text"
                    name="buttonText2"
                    value={customTemplateData.buttonText2}
                    onChange={handleChange}
                    placeholder="e.g. Visit our website"
                    maxLength={25}
                    className="w-full border rounded-md p-2 pr-12 text-sm focus:outline-blue-500"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    {customTemplateData.buttonText2.length}/25
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Footer buttons */}
          <div className="flex justify-end gap-4 mt-6">
            <button
              onClick={CancelTemplate}
              className="px-[24px] py-[10px] bg-[#E9E9E9] rounded-[4px] text-black text-[14px] font-semibold hover:bg-[#E9E9E9]"
            >
              Cancel
            </button>
            <button
              onClick={SaveTemplate}
              className="px-[24px] py-[10px] bg-[#343E55] rounded-[4px] text-[#FFFFFF] text-[14px] font-semibold hover:bg-[#1f2a44]"
            >
              Save Template
            </button>
          </div>
        </div>
      </CustomModal>
      {/* Test Message Popup */}
      <TestMessagePopup
        showTestPopup={showTestPopup}
        setShowTestPopup={setShowTestPopup}
        testPhoneNumber={testPhoneNumber}
        setTestPhoneNumber={setTestPhoneNumber}
        testLoading={testLoading}
        handleSendTestMessage={handleSendTestMessage}
        selectedTemplate={selectedTemplate}
        currentWorkflowData={currentWorkflowData}
      />
    </>
  );
}

export default Editflow;
