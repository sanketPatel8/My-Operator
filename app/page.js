"use client";

import Image from "next/image";
import { useState } from "react";
import ConnectShopify from "./component/ConnectShopify/page";
import ConfigureWhatsApp from "./component/ConfigureWhatsApp/page";
import ConnectWhatsApp from "./component/ConnectWhatsApp/page";
import Sidebar from "./component/sidebar/page";
import ConfigurationForm from "./component/ConfigurationForm/page";
import WorkflowList from "./component/workflowlist/page";

export default function Home() {
  return (
    
      
        // <ConnectShopify />
        // <ConfigureWhatsApp />
        <ConnectWhatsApp />

    //     <div className="flex bg-white ">
    //   <Sidebar active="config" />
    //   <main className="max-w-full bg-white border-l border-[#E9E9E9]">
    //     <ConfigurationForm />
    //   </main>
    // </div>

    // <div className="flex">
    //   <Sidebar active="workflow" />
    //   <main className="flex-1">
    //     <h1 className="text-2xl font-bold p-6">Workflow Setup</h1>
    //     <WorkflowList />
    //   </main>
    // </div>
     
   
  );
}
