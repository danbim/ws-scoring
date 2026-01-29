import type { Component } from "solid-js";
import { createSignal } from "solid-js";
import { Button } from "@/components/ui/button";
import Input from "./ui/Input";
import Modal from "./ui/Modal";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  entityName: string;
  entityType: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmationModal: Component<DeleteConfirmationModalProps> = (props) => {
  const [confirmationText, setConfirmationText] = createSignal("");
  const [error, setError] = createSignal("");

  const handleConfirm = () => {
    if (confirmationText() !== props.entityName) {
      setError(`Please type "${props.entityName}" to confirm deletion`);
      return;
    }
    props.onConfirm();
    setConfirmationText("");
    setError("");
  };

  const handleCancel = () => {
    props.onCancel();
    setConfirmationText("");
    setError("");
  };

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={handleCancel}
      title={`Delete ${props.entityType}`}
      size="sm"
      footer={
        <div class="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
          <Button variant="secondary" class="w-full sm:w-auto" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="destructive" class="w-full sm:w-auto" onClick={handleConfirm}>
            Delete
          </Button>
        </div>
      }
    >
      <p class="text-xs sm:text-sm text-gray-500 mb-4">
        This action cannot be undone. To confirm, please type the {props.entityType} name:
        <strong class="ml-1">{props.entityName}</strong>
      </p>
      <Input
        value={confirmationText()}
        onInput={(e) => {
          setConfirmationText(e.currentTarget.value);
          setError("");
        }}
        placeholder={props.entityName}
        error={error()}
      />
    </Modal>
  );
};

export default DeleteConfirmationModal;
