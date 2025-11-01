const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying Evnto contracts to Monad testnet...");

  // Deploy EventRewardToken first
  const EventRewardToken = await ethers.getContractFactory("EventRewardToken");
  console.log("Deploying EventRewardToken...");

  // We'll set EventManager address after deploying it
  const rewardToken = await EventRewardToken.deploy(ethers.ZeroAddress);
  await rewardToken.waitForDeployment();
  const rewardTokenAddress = await rewardToken.getAddress();
  console.log("EventRewardToken deployed to:", rewardTokenAddress);

  // Deploy EventManager
  const EventManager = await ethers.getContractFactory("EventManager");
  console.log("Deploying EventManager...");

  const eventManager = await EventManager.deploy();
  await eventManager.waitForDeployment();
  const eventManagerAddress = await eventManager.getAddress();
  console.log("EventManager deployed to:", eventManagerAddress);

  // Deploy EventNFT
  const EventNFT = await ethers.getContractFactory("EventNFT");
  console.log("Deploying EventNFT...");

  const eventNFT = await EventNFT.deploy(eventManagerAddress);
  await eventNFT.waitForDeployment();
  const eventNFTAddress = await eventNFT.getAddress();
  console.log("EventNFT deployed to:", eventNFTAddress);

  // Update EventRewardToken with EventManager address
  console.log("Setting EventManager address in RewardToken...");
  await rewardToken.addMinter(eventManagerAddress);

  console.log("\n=== Deployment Summary ===");
  console.log("EventManager:", eventManagerAddress);
  console.log("EventNFT:", eventNFTAddress);
  console.log("EventRewardToken:", rewardTokenAddress);

  console.log("\n=== Environment Variables ===");
  console.log("Add these to your .env file:");
  console.log(`NEXT_PUBLIC_EVENT_MANAGER_CONTRACT=${eventManagerAddress}`);
  console.log(`NEXT_PUBLIC_NFT_MINTER_CONTRACT=${eventNFTAddress}`);
  console.log(`NEXT_PUBLIC_TOKEN_REWARDS_CONTRACT=${rewardTokenAddress}`);

  // Verify contracts (optional)
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("\nVerifying contracts...");
    try {
      await hre.run("verify:verify", {
        address: eventManagerAddress,
        constructorArguments: [],
      });

      await hre.run("verify:verify", {
        address: eventNFTAddress,
        constructorArguments: [eventManagerAddress],
      });

      await hre.run("verify:verify", {
        address: rewardTokenAddress,
        constructorArguments: [ethers.ZeroAddress],
      });
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
