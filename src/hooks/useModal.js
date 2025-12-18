import { useState, useCallback } from "react";

export const useModal = () => {
  const [modal, setModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
    onConfirm: null,
    confirmText: "OK",
    cancelText: "Cancel",
    showCancel: false,
    children: null,
  });

  const openModal = useCallback(
    ({
      title = "",
      message = "",
      type = "info",
      onConfirm = null,
      confirmText = "OK",
      cancelText = "Cancel",
      showCancel = false,
      children = null,
    }) => {
      setModal({
        isOpen: true,
        title,
        message,
        type,
        onConfirm,
        confirmText,
        cancelText,
        showCancel,
        children,
      });
    },
    []
  );

  const closeModal = useCallback(() => {
    setModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const showAlert = useCallback(
    ({ title, message, type = "info" }) => {
      return new Promise((resolve) => {
        openModal({
          title,
          message,
          type,
          onConfirm: () => {
            closeModal();
            resolve(true);
          },
        });
      });
    },
    [openModal, closeModal]
  );

  const showConfirm = useCallback(
    ({ title, message, confirmText = "Confirm", cancelText = "Cancel" }) => {
      return new Promise((resolve) => {
        let resolved = false;
        openModal({
          title,
          message,
          type: "confirm",
          showCancel: true,
          confirmText,
          cancelText,
          onConfirm: () => {
            if (!resolved) {
              resolved = true;
              closeModal();
              resolve(true);
            }
          },
          onCancel: () => {
            if (!resolved) {
              resolved = true;
              closeModal();
              resolve(false);
            }
          },
        });
      });
    },
    [openModal, closeModal]
  );

  return {
    modal,
    openModal,
    closeModal,
    showAlert,
    showConfirm,
  };
};

