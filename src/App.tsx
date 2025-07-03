// App.js
import React, { useState, useEffect, useCallback } from "react";
import AllCampaigns from "./components/AllCampaigns";
import MyCampaigns from "./components/MyCampaigns";
import CampaignDetails from "./components/CampaignDetails";
import CreateCampaignModal from "./components/CreateCampaignModal";
import {
  ConnectButton,
  useActiveAccount,
  useReadContract,
  useSendTransaction,
} from "thirdweb/react";
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
  goal: bigint; // Stored as string to handle BigNumber from ethers.js
  duration: bigint;
  creationTime: bigint;
}

export interface Tier {
  name: string;
  amount: bigint; // Stored as string to handle BigNumber from ethers.js
  backers: number;
}

export type CampaignState = 0 | 1 | 2; // 0=Active, 1=Successful, 2=Failed

// --- Helper Components ---

const MessageBox: React.FC<{
  message: string | null;
  type: "error" | "success" | "";
  onClose: () => void;
}> = ({ message, type, onClose }) => {
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

export const LoadingSpinner: React.FC<{
  message?: string;
}> = ({ message = "Loading..." }) => (
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

export const contract = getContract({
  address: CONTRACT_ADDRESS,
  client,
  chain: sepolia,
});

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

  const [view, setView] = useState<
    "allCampaigns" | "myCampaigns" | "campaignDetails"
  >("allCampaigns");
  const [selectedCampaignAddress, setSelectedCampaignAddress] = useState<
    string | null
  >(null);
  const [showCreateCampaignModal, setShowCreateCampaignModal] =
    useState<boolean>(false);
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);

  const [message, setMessage] = useState<string>("");
  const [messageType, setMessageType] = useState<"error" | "success" | "">("");
  const [loading, setLoading] = useState<boolean>(false);

  const showMessage = (msg: string, type: "success" | "error" = "success") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(""), 5000);
  };

  // --- Main App Render ---
  return (
    <div className="font-inter antialiased bg-gray-900 text-gray-100 min-h-screen flex flex-col">
      <MessageBox
        message={message}
        type={messageType}
        onClose={() => setMessage("")}
      />

      <header className="bg-gray-800 shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-400">CrowdFund DApp</h1>
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
        <ConnectButton
          client={client}
          detailsButton={{
            className:
              "bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed",
          }}
        />
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
                allCampaigns={allCampaigns}
                setAllCampaigns={setAllCampaigns}
                currentAccount={account.address}
                showMessage={showMessage}
                setView={setView}
                setSelectedCampaignAddress={setSelectedCampaignAddress}
                campaignListType={"all"}
              />
            )}
            {view === "myCampaigns" && (
              <MyCampaigns
                allCampaigns={allCampaigns}
                setAllCampaigns={setAllCampaigns}
                currentAccount={account.address}
                showMessage={showMessage}
                setView={setView}
                setSelectedCampaignAddress={setSelectedCampaignAddress}
                campaignListType={"my"}
              />
            )}
            {view === "campaignDetails" && selectedCampaignAddress && (
              <CampaignDetails
                campaignAddress={selectedCampaignAddress}
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
                  params: [
                    campaignData.name,
                    campaignData.description,
                    toWei(campaignData.goal),
                    BigInt(campaignData.duration),
                  ],
                });

                return await new Promise((resolve, reject) => {
                  sendTransaction(transaction, {
                    onSuccess: () => {
                      showMessage("Campaign created!");
                      // setAllCampaigns(prev => prev.push(transaction))
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
                });
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

export { App };
