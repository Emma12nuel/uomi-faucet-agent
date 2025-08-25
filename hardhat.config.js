require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.20",
  networks: {
    uomiTestnet: {
      url: "https://testnet-rpc.uomi.network", // replace if different
      accounts: ["YOUR_PRIVATE_KEY_HERE"],     // keep safe, use .env in real projects
    },
  },
};
