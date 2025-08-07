"use client";

import Image from "next/image";
import { useState } from "react";
import ConnectShopify from "./(page)/ConnectShopify/page";
import ConfigureWhatsApp from "./(page)/ConfigureWhatsApp/page";
import ConnectWhatsApp from "./(page)/ConnectWhatsApp/page";
import Sidebar from "./(page)/sidebar/page";
import ConfigurationForm from "./(page)/ConfigurationForm/page";
import WorkflowList from "./(page)/workflowlist/page";

export default function Home() {
  return (
    <ConnectShopify />
    // <ConfigureWhatsApp />
    // <ConnectWhatsApp />

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
