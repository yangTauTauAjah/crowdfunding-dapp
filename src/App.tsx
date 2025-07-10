// App.js
import React, { useState } from "react";
import AllCampaigns from "./components/AllCampaigns";
import MyCampaigns from "./components/MyCampaigns";
import CampaignDetails from "./components/CampaignDetails";
import CreateCampaignModal from "./components/CreateCampaignModal";
import {
  ConnectButton,
  useActiveAccount,
  useSendTransaction,
} from "thirdweb/react";
import { client } from "./client";
import { getContract, prepareContractCall } from "thirdweb";
import { sepolia } from "thirdweb/chains";
import { CONTRACT_ADDRESS } from "./constants/contracts";

// --- Type Definitions ---
export interface Campaign {
  campaignAddress: string;
  owner: string;
  name: string;
  description: string;
  goal: bigint;
  duration: bigint;
  paused: boolean;
  creationTime: bigint;
}

export interface Tier {
  name: string;
  amount: bigint;
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
  const [displayNavbarCta, setDisplayNavbarCta] = useState(false);

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
      {/* <nav className="bg-white border-gray-200 dark:bg-gray-900">
        <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
          <h1 className="text-2xl font-bold text-blue-400">CrowdFund DApp</h1>

          <div className="flex md:order-2 space-x-3 md:space-x-0 rtl:space-x-reverse">
            <ConnectButton
              client={client}
              detailsButton={{
                className:
                  "bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed",
              }}
            />
            <button
              // dataCollapseToggle="navbar-cta"
              type="button"
              className="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
              // aria-controls="navbar-cta"
              aria-expanded="false"
              onClick={() => {
                setDisplayNavbarCta(!displayNavbarCta);
              }}
            >
              <span className="sr-only">Open main menu</span>
              <svg
                className="w-5 h-5"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 17 14"
              >
                <path
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M1 1h15M1 7h15M1 13h15"
                />
              </svg>
            </button>
          </div>
          {displayNavbarCta && (
            <div
              className="items-center justify-between w-full md:flex md:w-auto md:order-1"
              // id="navbar-cta"
            >
              <ul className="z-10 flex flex-col font-medium p-4 md:p-0 mt-4 border border-gray-100 rounded-lg bg-gray-50 md:space-x-8 rtl:space-x-reverse md:flex-row md:mt-0 md:border-0 md:bg-white dark:bg-gray-800 md:dark:bg-gray-900 dark:border-gray-700">
                <li>
                  <button
                    className="w-full block py-2 px-3 md:p-0 text-white bg-blue-700 rounded-sm md:bg-transparent md:text-blue-700 md:dark:text-blue-500"
                    aria-current="page"
                    onClick={() => {
                      setView("allCampaigns");
                      setSelectedCampaignAddress(null);
                    }}
                  >
                    All Campaigns
                  </button>
                </li>
                <li>
                  <button
                    className="w-full block py-2 px-3 md:p-0 text-gray-900 rounded-sm hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700"
                    onClick={() => {
                      setView("myCampaigns");
                      setSelectedCampaignAddress(null);
                    }}
                  >
                    My Campaigns
                  </button>
                </li>
                <li>
                  <button
                    className="w-full block py-2 px-3 md:p-0 text-gray-900 rounded-sm hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700"
                    onClick={() => {
                      setShowCreateCampaignModal(true);
                    }}
                  >
                    Create Campaign
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </nav> */}

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
                    BigInt(campaignData.goal),
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
