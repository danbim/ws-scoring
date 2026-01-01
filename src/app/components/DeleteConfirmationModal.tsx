import type { Component } from "solid-js";
import { createSignal, Show } from "solid-js";

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
    <Show when={props.isOpen}>
      <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div class="mt-3">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Delete {props.entityType}</h3>
            <p class="text-sm text-gray-500 mb-4">
              This action cannot be undone. To confirm, please type the {props.entityType} name:
              <strong class="ml-1">{props.entityName}</strong>
            </p>
            <input
              type="text"
              value={confirmationText()}
              onInput={(e) => {
                setConfirmationText(e.currentTarget.value);
                setError("");
              }}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder={props.entityName}
            />
            {error() && <p class="mt-2 text-sm text-red-600">{error()}</p>}
            <div class="flex justify-end space-x-3 mt-4">
              <button
                onClick={handleCancel}
                class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default DeleteConfirmationModal;
