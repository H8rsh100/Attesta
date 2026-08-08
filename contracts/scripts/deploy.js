const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying CredentialRegistry with account:", deployer.address);
  console.log(
    "Account balance:",
    (await ethers.provider.getBalance(deployer.address)).toString()
  );

  const CredentialRegistry = await ethers.getContractFactory(
    "CredentialRegistry"
  );
  const registry = await CredentialRegistry.deploy(deployer.address);

  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("CredentialRegistry deployed to:", address);
  console.log("Admin / initial issuer:", deployer.address);
  console.log("\nSave this address to your .env files:");
  console.log(`CONTRACT_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
