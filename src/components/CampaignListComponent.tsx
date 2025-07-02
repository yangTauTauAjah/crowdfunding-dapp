import { useEffect, useState } from "react";
import { Campaign, contract, formatWeiToEth, LoadingSpinner } from "../App";
import { useReadContract } from "thirdweb/react";
import { getContract, readContract } from "thirdweb";
import { client } from "../client";
import { sepolia } from "thirdweb/chains";

// --- Campaign List Component (Handles both All and My Campaigns) ---
export interface CampaignListComponentProps {
  currentAccount: string | null;
  showMessage: (msg: string, type?: "success" | "error") => void;
  loading: boolean; // Prop to control loading state
  setLoading: (isLoading: boolean) => void;
  setView: (view: "allCampaigns" | "myCampaigns" | "campaignDetails") => void;
  setSelectedCampaignAddress: (address: string | null) => void;
  campaignListType: "all" | "my"; // New prop to determine which list to display
}

const CampaignListComponent: React.FC<CampaignListComponentProps> = ({
  currentAccount,
  showMessage,
  loading,
  setLoading,
  setView,
  setSelectedCampaignAddress,
  campaignListType,
}) => {
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);

  const [userCampaigns, setUserCampaigns] = useState<Campaign[]>([]);
    
  const {data, isPending} = useReadContract({
    contract,
    method:
      "function getAllCampaigns() view returns ((address campaignAddress, address owner, string name, uint256 creationTime)[])",
    params: [],
  })

  /* const [factoryOwner, setFactoryOwner] = useState<string>(
    "0xFactoryOwnerAddress"
  ); */
  // const [isFactoryPaused, setIsFactoryPaused] = useState<boolean>(false);

  const [isFetchingCampaigns, setIsFetchingCampaigns] =
    useState<boolean>(false); // Still useful for mock loading states

  useEffect(() => {
    setIsFetchingCampaigns(true);

    const mappedCampaign = data?.map(async (e) => {
      const contract = getContract({
        client,
        chain: sepolia,
        address: e.campaignAddress,
      });

      const description = await readContract({
        contract,
        method: "function description() view returns (string)",
        params: [],
      });

      const goal = (
        await readContract({
          contract,
          method: "function goal() view returns (uint256)",
          params: [],
        })
      ).toString();

      const deadline = Number(
        await readContract({
          contract,
          method: "function deadline() view returns (uint256)",
          params: [],
        })
      );

      return {
        campaignAddress: e.campaignAddress,
        owner: e.owner,
        name: e.name,
        description,
        goal,
        duration: deadline,
        creationTime: Number(e.creationTime),
      };
    }) || [];

    Promise.all(mappedCampaign)
      .then((campaigns) => {
        setIsFetchingCampaigns(false);
        setAllCampaigns(campaigns);

        if (currentAccount) {
          const userCreated = campaigns.filter(
            (campaign) => {
              return campaign.owner.toLowerCase() === currentAccount.toLowerCase()
            }
          );
          setUserCampaigns(userCreated);
        }
      })
      .catch((error) => {
        console.error("Error fetching campaigns:", error);
        setIsFetchingCampaigns(false);
      });
  }, [currentAccount, data]);

  /* const handleToggleFactoryPause = () => {
    setLoading(true);
    showMessage(
      `Simulating factory ${isFactoryPaused ? "unpause" : "pause"}...`,
      "success"
    );
    setTimeout(() => {
      setIsFactoryPaused((prev) => !prev);
      showMessage(
        `Factory ${isFactoryPaused ? "unpaused" : "paused"} (UI only)!`
      );
      setLoading(false);
    }, 1000);
  }; */

  const campaignsToDisplay =
    campaignListType === "all" ? allCampaigns : userCampaigns;
  const title = campaignListType === "all" ? "All Campaigns" : "My Campaigns";

  return (
    <div className="container mx-auto p-6 bg-gray-900 min-h-screen">
      <h1 className="text-4xl font-extrabold mb-8 text-center text-blue-300">
        {title}
      </h1>

      {/* {currentAccount &&
        factoryOwner &&
        currentAccount.toLowerCase() === factoryOwner.toLowerCase() && (
          <div className="mb-8 p-6 bg-gray-800 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4 text-yellow-300">
              Factory Owner Actions (UI Only)
            </h2>
            <p className="mb-4 text-yellow-200">
              Factory Status: {isFactoryPaused ? "Paused" : "Active"}
            </p>
            <button
              onClick={handleToggleFactoryPause}
              disabled={loading}
              className={`w-full py-2 px-4 rounded-md font-bold transition duration-300 ${
                isFactoryPaused
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              } text-white`}
            >
              {isFactoryPaused ? "Unpause Factory" : "Pause Factory"}
            </button>
          </div>
        )} */}

      {isFetchingCampaigns ? (
        <LoadingSpinner message="Fetching campaigns..." />
      ) : campaignsToDisplay.length === 0 ? (
        <p className="text-gray-400">No campaigns found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaignsToDisplay.map((campaign) => (
            <div
              key={campaign.campaignAddress}
              className="bg-gray-800 h-72 flex flex-col p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold text-blue-400 mb-2">
                {campaign.name}
              </h3>
              <p
                className="text-gray-300 mb-2 h-full overflow-hidden text-ellipsis whitespace-break-spaces"
                style={{ maxWidth: "100%" }}
              >
                {campaign.description}
              </p>
              <p className="text-gray-200">
                Goal: {formatWeiToEth(campaign.goal)} ETH
              </p>
              <p className="text-gray-400">
                Owner: {campaign.owner.substring(0, 6)}...
                {campaign.owner.substring(campaign.owner.length - 4)}
              </p>
              <p className="text-gray-400">
                Created:{" "}
                {new Date(campaign.creationTime * 1000).toLocaleDateString()}
              </p>
              <button
                onClick={() => {
                  setSelectedCampaignAddress(campaign.campaignAddress);
                  setView("campaignDetails");
                }}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CampaignListComponent;
