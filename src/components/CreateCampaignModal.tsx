import React, { useState } from "react";
import { contract } from "../App";
import { useReadContract, useSendTransaction } from "thirdweb/react";
import { prepareContractCall, sendTransaction, toEther, toWei } from "thirdweb";

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCampaign: (campaignData: {
    name: string;
    description: string;
    goal: string;
    duration: string;
  }) => Promise<void>;
  loading: boolean;
  isFactoryPaused: boolean;
  showMessage: (msg: string, type?: "success" | "error") => void;
}

const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({
  isOpen,
  onClose,
  onCreateCampaign,
  loading,
  isFactoryPaused,
  showMessage,
}) => {
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    description: "",
    goal: "", // in ETH
    duration: "",
  });

  /* const [name, setName] = useState<string>();
  const [description, setDescription] = useState<string>();
  const [goal, setGoal] = useState<string>();
  const [duration, setDuration] = useState<string>(); */

  const [isCreatingCampaign, setIsCreatingCampaign] = useState<boolean>(false);

  const handleCreateCampaignChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setNewCampaign((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreatingCampaign(true);

    try {
      await onCreateCampaign(newCampaign);
      showMessage("Campaign created successfully!", "success");
      setNewCampaign({ name: "", description: "", goal: "", duration: "" });
      onClose();
    } catch(error) {
      showMessage("Failed to create campaign", "error");
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold"
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-6 text-blue-300">
          Create New Campaign
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="modal-name"
              className="block text-gray-300 text-sm font-bold mb-2"
            >
              Campaign Name:
            </label>
            <input
              type="text"
              id="modal-name"
              name="name"
              value={newCampaign.name}
              onChange={handleCreateCampaignChange}
              className="shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 bg-gray-900 text-gray-100 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
              placeholder="e.g., Build a Community Garden"
              required
            />
          </div>
          <div>
            <label
              htmlFor="modal-description"
              className="block text-gray-300 text-sm font-bold mb-2"
            >
              Description:
            </label>
            <textarea
              id="modal-description"
              name="description"
              value={newCampaign.description}
              onChange={handleCreateCampaignChange}
              className="shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 bg-gray-900 text-gray-100 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500 h-24"
              placeholder="Describe your project in detail..."
              required
            ></textarea>
          </div>
          <div>
            <label
              htmlFor="modal-goal"
              className="block text-gray-300 text-sm font-bold mb-2"
            >
              Funding Goal (ETH):
            </label>
            <input
              type="number"
              id="modal-goal"
              name="goal"
              value={newCampaign.goal}
              onChange={handleCreateCampaignChange}
              className="shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 bg-gray-900 text-gray-100 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
              placeholder="e.g., 10.5"
              step="0.0001"
              min="0.000000000000000001"
              required
            />
          </div>
          <div>
            <label
              htmlFor="modal-duration"
              className="block text-gray-300 text-sm font-bold mb-2"
            >
              Duration (Days):
            </label>
            <input
              type="number"
              id="modal-duration"
              name="duration"
              value={newCampaign.duration}
              onChange={handleCreateCampaignChange}
              className="shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 bg-gray-900 text-gray-100 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
              placeholder="e.g., 30"
              min="1"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isCreatingCampaign || loading || isFactoryPaused}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreatingCampaign ? "Creating..." : "Create Campaign"}
          </button>
          {isFactoryPaused && (
            <p className="text-red-400 text-sm text-center mt-2">
              Factory is paused. Cannot create campaigns.
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default CreateCampaignModal;
