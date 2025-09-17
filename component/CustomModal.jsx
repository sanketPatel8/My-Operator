"use client";

import React from "react";
import Modal from "react-modal";
import { IoCloseSharp } from "react-icons/io5";

// 🔧 Configure react-modal only on the client
if (typeof window !== "undefined") {
  Modal.setAppElement("body"); // or "#app-root" if you added that div in RootLayout
}

const CustomModal = ({ isOpen, closeModal, title, children }) => {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={closeModal}
      contentLabel={title}
      style={{
        overlay: { backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999 },
        content: {
          maxWidth: "70vw",
          maxHeight: "70vh",
          margin: "auto",
          borderRadius: "12px",
          padding: "20px",
          zIndex: 1000,
        },
      }}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold ">{title}</h2>
        <button onClick={closeModal} className="">
          <IoCloseSharp size={25} />
        </button>
      </div>

      <div>{children}</div>
    </Modal>
  );
};

export default CustomModal;
