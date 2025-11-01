const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying ZK Priority Ticket System to Monad...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());
  console.log();

  // Step 1: Deploy Groth16Verifier
  console.log("1️⃣ Deploying Groth16Verifier contract...");
  const Verifier = await hre.ethers.getContractFactory("Groth16Verifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();
  const verifierAddress = await verifier.getAddress();
  console.log("✅ Verifier deployed to:", verifierAddress);
  console.log();

  // Step 2: Deploy EventTicket
  console.log("2️⃣ Deploying EventTicket contract...");
  const EventTicket = await hre.ethers.getContractFactory("EventTicket");
  const eventTicket = await EventTicket.deploy(verifierAddress);
  await eventTicket.waitForDeployment();
  const eventTicketAddress = await eventTicket.getAddress();
  console.log("✅ EventTicket deployed to:", eventTicketAddress);
  console.log();

  // Step 3: Verify deployment
  console.log("3️⃣ Verifying deployment...");
  const priorityPrice = await eventTicket.priorityTicketPrice();
  const standardPrice = await eventTicket.standardTicketPrice();
  console.log("   Priority ticket price:", hre.ethers.formatEther(priorityPrice), "ETH");
  console.log("   Standard ticket price:", hre.ethers.formatEther(standardPrice), "ETH");
  console.log();

  // Step 4: Summary
  console.log("📋 Deployment Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Verifier Contract:", verifierAddress);
  console.log("EventTicket Contract:", eventTicketAddress);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log();

  console.log("📝 Next Steps:");
  console.log("1. Update .env.local with:");
  console.log(`   NEXT_PUBLIC_VERIFIER_ADDRESS=${verifierAddress}`);
  console.log(`   NEXT_PUBLIC_EVENT_TICKET_ADDRESS=${eventTicketAddress}`);
  console.log();
  console.log("2. Generate ZK verification key:");
  console.log("   cd circuits");
  console.log("   npm run setup");
  console.log("   npm run contribute");
  console.log("   npm run export-verifier");
  console.log();
  console.log("3. Update Verifier.sol with generated verifier");
  console.log("4. Redeploy contracts if needed");
  console.log();

  // Save addresses to file
  const fs = require('fs');
  const addresses = {
    verifier: verifierAddress,
    eventTicket: eventTicketAddress,
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(
    'deployed-addresses.json',
    JSON.stringify(addresses, null, 2)
  );

  console.log("✅ Deployment complete! Addresses saved to deployed-addresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
