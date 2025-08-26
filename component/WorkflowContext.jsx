"use client";

import { createContext, useContext, useState } from 'react';

const WorkflowContext = createContext();

export const WorkflowProvider = ({ children }) => {
  const [fetched, setFetched] = useState(false);

  return (
    <WorkflowContext.Provider value={{ fetched, setFetched }}>
      {children}
    </WorkflowContext.Provider>
  );
};

export const useWorkflow = () => useContext(WorkflowContext);
