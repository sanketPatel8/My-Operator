import { useState, useCallback } from "react";

export const useModal = () => {
  const [ModelIsOpen, setModelIsOpen] = useState(false);


  const openModal = useCallback(() => setModelIsOpen(true), []);
  const closeModal = useCallback(() => setModelIsOpen(false), []);

  return { ModelIsOpen, openModal, closeModal };
};
