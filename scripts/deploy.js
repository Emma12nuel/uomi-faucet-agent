const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contract with account:", deployer.address);

  const Faucet = await hre.ethers.getContractFactory("UomiLifeline");
  const faucet = await Faucet.deploy(
    hre.ethers.parseEther("0.01"), // dripAmount (0.01 UOMI)
    3600,                          // cooldown (1 hour)
    hre.ethers.parseEther("0.5")   // minBalance
  );

  await faucet.waitForDeployment();
  console.log("Uomi Lifeline deployed to:", faucet.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
