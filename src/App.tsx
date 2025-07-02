// App.js
import React, { useState, useEffect, useCallback } from "react";
import AllCampaigns from "./components/AllCampaigns";
import MyCampaigns from "./components/MyCampaigns";
import CampaignDetails from "./components/CampaignDetails";
import CreateCampaignModal from "./components/CreateCampaignModal";
import { ConnectButton, useActiveAccount, useReadContract, useSendTransaction } from "thirdweb/react";
import { client } from "./client";
import { getContract, prepareContractCall, toEther, toWei } from "thirdweb";
import { baseSepolia, sepolia } from "thirdweb/chains";
import { CONTRACT_ADDRESS } from "./constants/contracts";

// --- Type Definitions ---
export interface Campaign {
  campaignAddress: string;
  owner: string;
  name: string;
  description: string;
  goal: string; // Stored as string to handle BigNumber from ethers.js
  duration: number;
  creationTime: number;
}

export interface Tier {
  name: string;
  amount: string; // Stored as string to handle BigNumber from ethers.js
  backers: number;
}

export type CampaignState = 0 | 1 | 2; // 0=Active, 1=Successful, 2=Failed

// --- Helper Components ---

interface MessageBoxProps {
  message: string | null;
  type: "error" | "success" | "";
  onClose: () => void;
}

const MessageBox: React.FC<MessageBoxProps> = ({ message, type, onClose }) => {
  if (!message) return null;
  const bgColor = type === "error" ? "bg-red-500" : "bg-green-500";
  return (
    <div
      className={`fixed top-4 right-4 flex p-4 rounded-lg shadow-lg text-white ${bgColor} z-50`}
    >
      <p>{message}</p>
      <button onClick={onClose} className="ml-4 font-bold">
        X
      </button>
    </div>
  );
};

export interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = "Loading...",
}) => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
    <p className="ml-3 text-gray-700">{message}</p>
  </div>
);

// --- Utility for formatting (pure JS, replaces ethers.js for UI-only) ---
// Hardcode WEI_PER_ETHER to avoid BigInt exponentiation which might cause issues in some environments
export const WEI_PER_ETHER = BigInt("1000000000000000000"); // 10^18

export const formatWeiToEth = (weiAmount: string): string => {
  if (!weiAmount) return "0";
  try {
    const bigIntWei = BigInt(weiAmount);
    const integerPart = bigIntWei / WEI_PER_ETHER;
    let fractionalPart = bigIntWei % WEI_PER_ETHER;

    // Convert fractionalPart to string and pad with leading zeros to 18 digits
    let fractionalString = fractionalPart.toString().padStart(18, "0");

    // Trim trailing zeros, but keep at least one if it's '0'
    fractionalString = fractionalString.replace(/0+$/, "");
    if (fractionalString === "") fractionalString = "0";

    // If the fractional part is all zeros, return only the integer part
    if (fractionalString === "0") {
      return integerPart.toString();
    }

    return `${integerPart}.${fractionalString}`;
  } catch (e) {
    console.error("Error formatting wei to eth:", e);
    return "0";
  }
};

export const parseEthToWei = (ethAmount: string): string => {
  if (!ethAmount) return "0";
  try {
    const parts = ethAmount.split(".");
    let integerPart = parts[0];
    let fractionalPart = parts[1] || "";

    // Pad or truncate fractional part to 18 digits
    if (fractionalPart.length > 18) {
      fractionalPart = fractionalPart.substring(0, 18);
    } else {
      fractionalPart = fractionalPart.padEnd(18, "0");
    }

    const combined = BigInt(integerPart + fractionalPart);
    return combined.toString();
  } catch (e) {
    console.error("Error parsing eth to wei:", e);
    return "0";
  }
};

// --- CreateCampaignModal Component ---
/* interface CreateCampaignModalProps {
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
} */

  export const contract = getContract({
  address: CONTRACT_ADDRESS,
  client,
  chain: sepolia,
})

// --- Main App Component ---

function App() {

  const account = useActiveAccount();
    
  const { mutate: sendTransaction } = useSendTransaction();
    
  /* const {data: test__, isPending} = useReadContract({
    contract,
    method:
      "function getAllCampaigns() view returns ((address campaignAddress, address owner, string name, uint256 creationTime)[])",
    params: [],
  }) */

  /* const [currentAccount, setCurrentAccount] = useState<string | null>(
    "0xUserWalletAddress..."
  ); */ // Mock connected account
  // const [userId, setUserId] = useState<string | null>("user-id-mock"); // Mock user ID

  const [view, setView] = useState<
    "allCampaigns" | "myCampaigns" | "campaignDetails"
  >("allCampaigns"); // Removed 'createCampaign' as a direct view
  const [selectedCampaignAddress, setSelectedCampaignAddress] = useState<
    string | null
  >(null);
  const [showCreateCampaignModal, setShowCreateCampaignModal] =
    useState<boolean>(false); // New state for modal

  const [message, setMessage] = useState<string>("");
  const [messageType, setMessageType] = useState<"error" | "success" | "">("");
  const [loading, setLoading] = useState<boolean>(false);

  const showMessage = (msg: string, type: "success" | "error" = "success") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(""), 5000);
  };

  /* const connectWallet = useCallback(() => {
    setLoading(true);
    showMessage("Simulating wallet connection...", "success");
    setTimeout(() => {
      // setCurrentAccount("0xUserWalletAddressMockedForUI");
      setUserId("mock-user-id-123");
      showMessage("Wallet connected (UI only)!");
      setLoading(false);
    }, 1500);
  }, []); */

  // --- Main App Render ---
  return (
    <div className="font-inter antialiased bg-gray-900 text-gray-100 min-h-screen flex flex-col">
      <MessageBox
        message={message}
        type={messageType}
        onClose={() => setMessage("")}
      />

      <header className="bg-gray-800 shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-400">
          CrowdFund DApp
        </h1>
        <nav>
          {account && (
              <>
                <button
                  onClick={() => {
                    setView("allCampaigns");
                    setSelectedCampaignAddress(null);
                  }}
                  className={`px-4 py-2 rounded-md font-semibold transition duration-300 ${
                    view === "allCampaigns"
                      ? "bg-blue-600 text-white"
                      : "text-blue-300 hover:bg-gray-700"
                  }`}
                >
                  All Campaigns
                </button>
                <button
                  onClick={() => {
                    setView("myCampaigns");
                    setSelectedCampaignAddress(null);
                  }}
                  className={`ml-4 px-4 py-2 rounded-md font-semibold transition duration-300 ${
                    view === "myCampaigns"
                      ? "bg-blue-600 text-white"
                      : "text-blue-300 hover:bg-gray-700"
                  }`}
                >
                  My Campaigns
                </button>
                <button
                  onClick={() => {
                    setShowCreateCampaignModal(true);
                  }}
                  className={`ml-4 px-4 py-2 rounded-md font-semibold transition duration-300 ${
                    showCreateCampaignModal
                      ? "bg-blue-600 text-white"
                      : "text-blue-300 hover:bg-gray-700"
                  }`}
                >
                  Create New
                </button>
              </>
          )}
        </nav>
        {account ? (
          <div className="flex items-center space-x-2">
            <span className="text-gray-200">
              Connected: {account?.address/* .substring(0, 6) */}...
              {account.address.substring(account.address.length - 4)}
            </span>
            {/* <span className="text-gray-400 text-sm">
              User ID: {userId?.substring(0, 6)}...
              {userId?.substring(userId.length - 4)}
            </span> */}
          </div>
        ) : (
          <ConnectButton
            client={client}
            detailsButton={{
              className: "bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed",
            }}
          />
          /* <button
            onClick={connectWallet}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Connecting..." : "Connect Wallet"}
          </button> */
        )}
      </header>

      <main className="flex-grow p-6 bg-gray-900">
        {!account ? (
          <div className="text-center p-8 bg-gray-800 rounded-lg shadow-md mt-8">
            <p className="text-xl text-gray-200 mb-4">
              Please connect your MetaMask wallet to use the dApp.
            </p>
          </div>
        ) : (
          <>
            {view === "allCampaigns" && (
              <AllCampaigns
                currentAccount={account.address}
                showMessage={showMessage}
                loading={loading}
                setLoading={setLoading}
                setView={setView}
                setSelectedCampaignAddress={setSelectedCampaignAddress}
                campaignListType={"all"}
              />
            )}
            {view === "myCampaigns" && (
              <MyCampaigns
                currentAccount={account.address}
                showMessage={showMessage}
                loading={loading}
                setLoading={setLoading}
                setView={setView}
                setSelectedCampaignAddress={setSelectedCampaignAddress}
                campaignListType={"my"}
              />
            )}
            {view === "campaignDetails" && selectedCampaignAddress && (
              <CampaignDetails
                campaignAddress={selectedCampaignAddress}
                currentAccount={account.address}
                showMessage={showMessage}
                loading={loading}
                setLoading={setLoading}
                setView={setView}
              />
            )}
            <CreateCampaignModal
              isOpen={showCreateCampaignModal}
              onClose={() => setShowCreateCampaignModal(false)}
              onCreateCampaign={async (campaignData) => {
                setLoading(true);
                showMessage("Simulating campaign creation...", "success");

                const transaction = prepareContractCall({
                  contract,
                  method:
                    "function createCampaign(string _name, string _description, uint256 _goal, uint256 _duration)",
                  params: [campaignData.name, campaignData.description, toWei(campaignData.goal), BigInt(campaignData.duration)],
                });

                return await new Promise((resolve, reject) => {

                  sendTransaction(transaction, {
                    onSuccess: () => {
                      showMessage("Campaign created!");
                      setLoading(false);
                      resolve();
                    },
                    onError: (error) => {
                      console.error("Error creating campaign:", error);
                      showMessage("Failed to create campaign", "error");
                      setLoading(false);
                      reject("Failed to create campaign: " + error.message);
                    },
                  });

                })

                /* return new Promise<void>((resolve) => {
                  setTimeout(() => {
                    const newCampaignAddress = `0xMockCampaign${Math.random()
                      .toString(36)
                      .substring(2, 15)}Address`;
                    const newCampaignMock: Campaign = {
                      campaignAddress: newCampaignAddress,
                      owner: account.address!,
                      name: campaignData.name,
                      description: campaignData.description,
                      goal: parseEthToWei(campaignData.goal),
                      duration: parseInt(campaignData.duration),
                      creationTime: Math.floor(Date.now() / 1000),
                    };
                    console.log("Mock Campaign Created:", newCampaignMock);
                    showMessage("Campaign created (UI only)!");
                    setLoading(false);
                    resolve();
                  }, 2000);
                }); */
              }}
              loading={loading}
              isFactoryPaused={false}
              showMessage={showMessage}
            />
          </>
        )}
      </main>
    </div>
  );
}

export {App};
