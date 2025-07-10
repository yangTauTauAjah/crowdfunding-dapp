import React, { useEffect, useState } from "react";
import { Campaign, CampaignState, LoadingSpinner, Tier } from "../App";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { getContract, prepareContractCall, readContract, toWei } from "thirdweb";
import { client } from "../client";
import { sepolia } from "thirdweb/chains";

const CampaignStateMap: { [key in CampaignState]: string } = {
  0: "Active",
  1: "Successful",
  2: "Failed",
};

interface CampaignDetailsComponentProps {
  campaignAddress: string;
  showMessage: (msg: string, type?: "success" | "error") => void;
  loading: boolean; // Prop to control loading state
  setLoading: (isLoading: boolean) => void;
  setView: (view: "allCampaigns" | "myCampaigns" | "campaignDetails") => void;
}

const CampaignDetailsComponent: React.FC<CampaignDetailsComponentProps> = ({
  campaignAddress,
  showMessage,
  loading,
  setLoading,
  setView,
}) => {

  const { mutate: sendTransaction } = useSendTransaction();
  const account = useActiveAccount();

  const campaign = getContract({
    address: campaignAddress,
    client: client,
    chain: sepolia,
  })

  const [tiers, setTiers] = useState<Tier[]>([]);
  
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("")
  const [goal, setGoal] = useState<bigint>(BigInt(100));
  const [deadline, setDeadline] = useState<bigint>(BigInt(0));
  const [campaignOwner, setCampaignOwner] = useState<string>("");
  const [campaignState, setCampaignState] = useState<CampaignState>(0);
  const [currentBalance, setCurrentBalance] = useState<bigint>(BigInt(0));
  const [isCampaignPaused, setIsCampaignPaused] = useState<boolean | null>();
  const [backerContribution, setBackerContribution] = useState<bigint>(BigInt(0));
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  const [newTier, setNewTier] = useState<{ name: string; amount: string }>({
    name: "",
    amount: "",
  });

  const [tierToRemoveIndex, setTierToRemoveIndex] = useState<bigint | null>();
  const [daysToExtend, setDaysToExtend] = useState<bigint | null>();

  useEffect(() => {

    (async () => {

      setLoadingDetails(true)

      try {
        const name = await readContract({
        contract: campaign,
        method: "function name() view returns (string)"
        });

        setName(name);

        const description = await readContract({
          contract: campaign,
          method: "function description() view returns (string)"
        });

        setDescription(description);

        const owner = await readContract({
          contract: campaign,
          method: "function owner() view returns (address)"
        });

        setCampaignOwner(owner.toLowerCase());

        const deadline = await readContract({
          contract: campaign,
          method: "function deadline() view returns (uint256)"
        });

        setDeadline(deadline);

        const balance = await readContract({
          contract: campaign,
          method: "function getBalance() view returns (uint256)"
        });

        setCurrentBalance(balance);

        const goal = await readContract({
          contract: campaign,
          method: "function goal() view returns (uint256)"
        });

        setGoal(goal);

        const paused = await readContract({
          contract: campaign,
          method: "function paused() view returns (bool)"
        });

        setIsCampaignPaused(paused)
      
        if (account) {
          setIsOwner(owner.toLowerCase() === account.address.toLowerCase());
        }

        const now = Math.floor(Date.now() / 1000);
        let simulatedState: CampaignState = 0;
        if ( balance >= goal ) simulatedState = 1;
        else if (now >= deadline) simulatedState = 2;
        setCampaignState(simulatedState);

        const tiers = await readContract({
          contract: campaign,
          method: "function getTiers() view returns ((string name, uint256 amount, uint256 backers)[])",
          params: [],
        });

        setTiers(tiers.map(e => ({
          name: e.name,
          amount: e.amount,
          backers: Number(e.backers)
        })));

        setLoadingDetails(false)
      } catch (error) {
        console.error(error)
        showMessage("An error occured", "error");
        setLoadingDetails(false)
      }

    })();

  }, [ account, /* campaign */ ]);

  const handleFund = (tierIndex: number) => {
    setLoading(true);
    showMessage("Simulating funding...", "success");

    const transaction = prepareContractCall({
      contract: campaign,
      method: "function fund(uint256 _tierIndex) payable",
      params: [BigInt(tierIndex)],
      value: tiers[tierIndex].amount,
    });
    
    sendTransaction(transaction, {
      onSuccess: () => {
        showMessage("Funding successful!", "success");
        setLoading(false);
      },
      onError: (error) => {
        showMessage(`Error processing funding: ${error.message}`, "error");
        setLoading(false);
      },
    });

    /* setTimeout(() => {
      const fundedAmount = (tiers[tierIndex].amount);
      const newBalance = BigInt(currentBalance.toString()) + BigInt(fundedAmount.toString());
      setCurrentBalance(newBalance);
      setBackerContribution((prev) =>
        (prev + fundedAmount)
      );
      setTiers((prev) =>
        prev.map((tier, idx) =>
          idx === tierIndex ? { ...tier, backers: tier.backers + 1 } : tier
        )
      );
      showMessage("Successfully funded!");
      setLoading(false);
    }, 1500); */
  };

  const handleWithdraw = () => {
    setLoading(true);
    showMessage("Simulating withdrawal...", "success");

    const transaction = prepareContractCall({
      contract: campaign,
      method: "function withdraw()",
      params: [],
    });
    sendTransaction(transaction, {
      onSuccess: () => {
        setCurrentBalance(BigInt(0));
        showMessage("Funds withdrawn successfully!", "success");
        setLoading(false);
      },
      onError: (error) => {
        showMessage(`Error processing withdrawal: ${error.message}`, "error");
        setLoading(false);
      },
    });

    /* setTimeout(() => {
      setCurrentBalance("0");
      showMessage("Funds withdrawn (UI only)!");
      setLoading(false);
    }, 1500); */
  };

  const handleRefund = () => {
    setLoading(true);
    showMessage("Simulating refund...", "success");

    const transaction = prepareContractCall({
      contract: campaign,
      method: "function refund()",
      params: [],
    });
    sendTransaction(transaction, {
      onSuccess: () => {
        setBackerContribution(BigInt(0));
        showMessage("Refund successful!", "success");
        setLoading(false);
      },
      onError: (error) => {
        showMessage(`Error processing refund: ${error.message}`, "error");
        setLoading(false);
      },
    });
  };

  const handleAddTier = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    showMessage("Adding tier...", "success");

    const transaction = prepareContractCall({
      contract: campaign,
      method:
        "function addTier(string _name, uint256 _amount)",
      params: [newTier.name, BigInt(newTier.amount)],
    });
    sendTransaction(transaction, {
      onSuccess: () => {
        const newTierData: Tier = {
          name: newTier.name,
          amount: BigInt(newTier.amount),
          backers: 0,
        };
        setTiers((prev) => [...prev, newTierData]);
        setNewTier({ name: "", amount: "" });
        showMessage("Tier added successfully!", "success");
        setLoading(false);
      },
      onError: (error) => {
        showMessage(`Error adding tier: ${error.message}`, "error");
        setLoading(false);
      },
    });
  };

  const handleRemoveTier = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!tierToRemoveIndex) return;
    setLoading(true);

    const transaction = prepareContractCall({
      contract: campaign,
      method: "function removeTier(uint256 _index)",
      params: [BigInt(tierToRemoveIndex)],
    });

    sendTransaction(transaction, {
      onSuccess: () => {
        const index = Number(tierToRemoveIndex);
        setTiers((prev) => prev.filter((_, idx) => idx !== index));
        setTierToRemoveIndex(BigInt(0));
        showMessage("Tier removed!");
        setLoading(false);
      },
      onError: (error) => {
        showMessage(`Error removing tier: ${error.message}`, "error");
        setLoading(false);
      },
    });

    showMessage("Removing tier...", "success");
  };

  const handleExtendDeadline = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    showMessage("Simulating extending deadline...", "success");
    /* setTimeout(() => {
      const days = parseInt(daysToExtend);
      if (!isNaN(days) && days > 0) {
        setCampaignDetails((prev) => ({
          ...prev,
          deadline: prev.deadline + days * 24 * 60 * 60,
        }));
        setDaysToExtend("");
        showMessage(`Deadline extended by ${days} days (UI only)!`);
      } else {
        showMessage(
          "Days to add must be a positive number (UI only).",
          "error"
        );
      }
      setLoading(false);
    }, 1000); */
  };

  const handleTogglePause = () => {

    showMessage("Toggling campaign pause state...", "success");
    setLoading(true);

    const transaction = prepareContractCall({
      contract: campaign,
      method: "function togglePause()",
      params: [],
    });

    sendTransaction(transaction, {
      onSuccess: () => {
        showMessage(`Campaign ${isCampaignPaused ? "unpaused" : "paused"} successfully!`, "success");
        setIsCampaignPaused((prev) => !prev);
        setLoading(false);
      },
      onError: (error) => {
        showMessage(`Error toggling campaign pause: ${error.message}`, "error");
        setLoading(false);
      },
    });

  };

  if (loadingDetails) {
    return <LoadingSpinner message="Loading campaign details..." />;
  }

  const isCampaignActive = campaignState === 0;
  const isCampaignSuccessful = campaignState === 1;
  const isCampaignFailed = campaignState === 2;

  const currentGoalProgress =
    Number(currentBalance/goal) *
    100;

  return (
    <div className="container mx-auto p-6 bg-gray-900 min-h-screen">
      <button
        onClick={() => setView("allCampaigns")}
        className="mb-6 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold py-2 px-4 rounded-md transition duration-300"
      >
        &larr; Back to Campaigns
      </button>

      <div className="bg-gray-800 p-8 rounded-lg shadow-lg mb-8">
        <h1 className="text-4xl font-extrabold text-blue-300 mb-4">
          {name}
        </h1>
        <p className="text-gray-200 text-lg mb-4 min-h-32">
          {description}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-200">
          <p>
            <span className="font-semibold">Contract Address:</span>{" "}
            <a
              href={`https://sepolia.etherscan.io/address/${campaignAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm break-all text-blue-400 underline hover:text-blue-300 transition-colors cursor-pointer"
              title="View on Sepolia Etherscan"
            >
              {campaignAddress}
            </a>
          </p>
          <p>
            <span className="font-semibold">Owner:</span>{" "}
            <a
              href={`https://sepolia.etherscan.io/address/${campaignOwner}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm break-all text-blue-400 underline hover:text-blue-300 transition-colors cursor-pointer"
              title="View on Sepolia Etherscan"
            >
              {campaignOwner}
            </a>
          </p>
          <p>
            <span className="font-semibold">Goal:</span>{" "}
            {Number(goal)} $
          </p>
          <p>
            <span className="font-semibold">Current Balance:</span>{" "}
            {Number(currentBalance)} $
          </p>
          <p>
            <span className="font-semibold">Deadline:</span>{" "}
            {new Date(Number(deadline * BigInt(1000))).toLocaleString("en-US", {dateStyle: "medium"})}
          </p>
          <p>
            <span className="font-semibold">Status:</span>{" "}
            <span
              className={`font-bold ${
                isCampaignSuccessful
                  ? "text-green-400"
                  : isCampaignFailed
                  ? "text-red-400"
                  : "text-blue-400"
              }`}
            >
              {CampaignStateMap[campaignState]}
            </span>
          </p>
          <p>
            <span className="font-semibold">Paused:</span>{" "}
            {isCampaignPaused ? "Yes" : "No"}
          </p>
        </div>

        <div className="w-full bg-gray-700 rounded-full h-4 mt-6">
          <div
            className="bg-green-500 h-4 rounded-full"
            style={{ width: `${Math.min(100, currentGoalProgress)}%` }}
          ></div>
        </div>
        <p className="text-right text-sm text-gray-400 mt-2">
          {currentGoalProgress.toFixed(2)}% of goal reached
        </p>
      </div>

      {/* Funding Section */}
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg mb-8">
        <h2 className="text-2xl font-bold text-blue-200 mb-4">
          Fund This Campaign
        </h2>
        {!isCampaignActive ? (
          <p className="text-red-400 font-semibold">
            Campaign is not active for funding.
          </p>
        ) : isCampaignPaused ? (
          <p className="text-red-400 font-semibold">
            Campaign is currently paused by the owner.
          </p>
        ) : (
          <div>
            {tiers.length === 0 ? (
              <p className="text-gray-400">No funding tiers available yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tiers.map((tier, index) => (
                  <div key={index} className="border border-blue-900 p-4 rounded-md bg-gray-900">
                    <h3 className="font-semibold text-blue-400">{tier.name}</h3>
                    <p className="text-gray-300">
                      Amount: {Number(tier.amount)} $
                    </p>
                    <p className="text-gray-300">
                      Backers: {tier.backers.toString()}
                    </p>
                    <button
                      onClick={() => handleFund(index)}
                      disabled={loading}
                      className="mt-3 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Fund {Number(tier.amount)} $
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {Number(backerContribution) > 0 && (
          <p className="mt-4 text-gray-300">
            Your total contribution: {Number(backerContribution)} $
          </p>
        )}
      </div>

      {/* Backer Actions */}
      {backerContribution > 0 && isCampaignFailed && (
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg mb-8">
          <h2 className="text-2xl font-bold text-purple-200 mb-4">
            Your Actions as a Backer
          </h2>
          <button
            onClick={handleRefund}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Request Refund ({Number(backerContribution)} $)
          </button>
        </div>
      )}

      {/* Owner Actions */}
      {isOwner && (
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-gray-200 mb-4">
            Campaign Owner Actions
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Withdraw */}
            <div className="flex flex-col p-4 border border-green-900 rounded-md bg-gray-900">
              <h3 className="font-semibold text-green-400 mb-2">
                Withdraw Funds
              </h3>
              <p className="text-gray-300 mb-auto">
                Current Balance: {Number(currentBalance)} $
              </p>
              <button
                onClick={handleWithdraw}
                disabled={loading || !isCampaignSuccessful}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCampaignSuccessful
                  ? "Withdraw All Funds"
                  : "Campaign Not Successful"}
              </button>
            </div>

            {/* Add Tier */}
            <div className="p-4 border border-blue-900 rounded-md bg-gray-900">
              <h3 className="font-semibold text-blue-400 mb-2">Add New Tier</h3>
              <form onSubmit={handleAddTier} className="space-y-3">
                <input
                  type="text"
                  placeholder="Tier Name"
                  value={newTier.name}
                  onChange={(e) =>
                    setNewTier({ ...newTier, name: e.target.value })
                  }
                  className="shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 bg-gray-800 text-gray-100 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
                <input
                  type="number"
                  placeholder="Amount ($)"
                  value={newTier.amount.length > 0 ? Number(newTier.amount) : ""}
                  onChange={(e) =>
                    setNewTier({ ...newTier, amount: e.target.value })
                  }
                  className="shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 bg-gray-800 text-gray-100 leading-tight focus:outline-none focus:shadow-outline"
                  step="1"
                  min="0"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Tier
                </button>
              </form>
            </div>

            {/* Remove Tier */}
            <div className="p-4 border border-red-900 rounded-md bg-gray-900">
              <h3 className="font-semibold text-red-400 mb-2">Remove Tier</h3>
              <form onSubmit={handleRemoveTier} className="space-y-3">
                <input
                  type="number"
                  placeholder="Tier Index to Remove"
                  value={Number(tierToRemoveIndex)}
                  onChange={(e) => setTierToRemoveIndex(BigInt(e.target.value))}
                  className="shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 bg-gray-800 text-gray-100 leading-tight focus:outline-none focus:shadow-outline"
                  min="0"
                  max={tiers.length > 0 ? tiers.length - 1 : 0}
                />
                <button
                  type="submit"
                  disabled={loading || tiers.length === 0}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Remove Tier
                </button>
              </form>
            </div>

            {/* Extend Deadline */}
            <div className="p-4 border border-yellow-900 rounded-md bg-gray-900">
              <h3 className="font-semibold text-yellow-400 mb-2">
                Extend Deadline
              </h3>
              <form onSubmit={handleExtendDeadline} className="space-y-3">
                <input
                  type="number"
                  placeholder="Days to Add"
                  value={Number(daysToExtend) || ""}
                  onChange={(e) => setDaysToExtend(BigInt(e.target.value))}
                  className="shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 bg-gray-800 text-gray-100 leading-tight focus:outline-none focus:shadow-outline"
                  min="1"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Extend Deadline
                </button>
              </form>
            </div>

            {/* Toggle Pause */}
            {typeof isCampaignPaused === 'boolean' && <div className="flex flex-col p-4 border border-gray-700 rounded-md bg-gray-900">
              <h3 className="font-semibold text-gray-300 mb-2">
                Toggle Campaign Pause
              </h3>
              <p className="text-gray-300 mb-auto">
                Current Status: {isCampaignPaused ? "Paused" : "Active"}
              </p>
              <button
                onClick={handleTogglePause}
                disabled={loading}
                className={`w-full py-2 px-4 rounded-md font-bold transition duration-300 ${
                  isCampaignPaused
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isCampaignPaused ? "Unpause Campaign" : "Pause Campaign"}
              </button>
            </div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignDetailsComponent;
