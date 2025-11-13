"use client";

import React from "react";
import Modal from "react-modal";
import { IoCloseSharp } from "react-icons/io5";

// 🔧 Configure react-modal only on the client
if (typeof window !== "undefined") {
  Modal.setAppElement("body"); // or "#app-root" if you added that div in RootLayout
}

const CustomModal = ({
  isOpen,
  closeModal,
  title,
  children,
  width,
  height,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={closeModal}
      contentLabel={title}
      style={{
        overlay: { backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999 },
        content: {
          maxWidth: width || "600px",
          maxHeight: height || "600px",
          margin: "auto",
          borderRadius: "12px",
          padding: "20px",
          zIndex: 1000,
        },
      }}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg text-black font-bold ">{title}</h2>
        <button onClick={closeModal} className="text-black">
          <IoCloseSharp size={25}  />
        </button>
      </div>

      <div>{children}</div>
    </Modal>
  );
};

export default CustomModal;
