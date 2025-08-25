const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("UomiLifeline Faucet Agent", function () {
  let Faucet, faucet, owner, user1, user2;
  const dripAmount = ethers.parseEther("0.1"); // 0.1 ETH (or UOMI)
  const cooldown = 60; // 1 minute
  const minBalance = ethers.parseEther("1"); // balance threshold

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    Faucet = await ethers.getContractFactory("UomiLifeline");
    faucet = await Faucet.deploy(dripAmount, cooldown, minBalance);

    // Fund the faucet for testing
    await owner.sendTransaction({
      to: await faucet.getAddress(),
      value: ethers.parseEther("5"),
    });
  });

  it("should deploy with correct configuration", async function () {
    expect(await faucet.dripAmount()).to.equal(dripAmount);
    expect(await faucet.cooldownTime()).to.equal(cooldown);
    expect(await faucet.minBalance()).to.equal(minBalance);
    expect(await faucet.owner()).to.equal(owner.address);
  });

  it("should allow a user to claim tokens", async function () {
    const beforeBalance = await ethers.provider.getBalance(user1.address);
    const tx = await faucet.connect(user1).claim();
    const receipt = await tx.wait();

    const afterBalance = await ethers.provider.getBalance(user1.address);
    expect(afterBalance).to.be.greaterThan(beforeBalance);

    // Event check
    const event = receipt.logs.find(
      (log) => log.fragment.name === "TokensClaimed"
    );
    expect(event.args.user).to.equal(user1.address);
    expect(event.args.amount).to.equal(dripAmount);
  });

  it("should enforce cooldown between claims", async function () {
    await faucet.connect(user1).claim();
    await expect(faucet.connect(user1).claim()).to.be.revertedWith(
      "Wait before claiming again"
    );
  });

  it("should reduce drip when balance falls below minBalance", async function () {
    // Drain faucet close to minBalance
    const faucetBalance = await ethers.provider.getBalance(
      await faucet.getAddress()
    );
    const withdrawAmount = faucetBalance - minBalance + ethers.parseEther("0.05");

    // Send from faucet to owner manually (simulate low funds)
    await owner.sendTransaction({
      to: await faucet.getAddress(),
      value: ethers.parseEther("0"), // dummy send to trigger receipt
    });

    // Force faucet balance manipulation for test
    await ethers.provider.send("hardhat_setBalance", [
      await faucet.getAddress(),
      "0xDE0B6B3A7640000", // 1 ETH (same as minBalance)
    ]);

    const tx = await faucet.connect(user2).claim();
    const receipt = await tx.wait();

    const event = receipt.logs.find(
      (log) => log.fragment.name === "DripAdjusted"
    );
    expect(event.args.newDrip).to.equal(dripAmount / 2n); // halved
  });

  it("should only allow owner to update config", async function () {
    await expect(
      faucet.connect(user1).updateConfig(1, 1, 1)
    ).to.be.revertedWith("Not owner");

    await faucet
      .connect(owner)
      .updateConfig(ethers.parseEther("0.2"), 120, ethers.parseEther("2"));

    expect(await faucet.dripAmount()).to.equal(ethers.parseEther("0.2"));
    expect(await faucet.cooldownTime()).to.equal(120);
    expect(await faucet.minBalance()).to.equal(ethers.parseEther("2"));
  });

  it("should accept donations and emit event", async function () {
    const tx = await faucet.connect(user1).donate({ value: ethers.parseEther("1") });
    const receipt = await tx.wait();

    const event = receipt.logs.find(
      (log) => log.fragment.name === "DonationReceived"
    );
    expect(event.args.donor).to.equal(user1.address);
    expect(event.args.amount).to.equal(ethers.parseEther("1"));
  });
});
