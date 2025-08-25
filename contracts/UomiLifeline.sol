// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Uomi Lifeline Faucet Agent
 * @notice A unique faucet agent designed for the UOMI testnet
 *         Provides fair token drips with anti-bot protection,
 *         cooldowns, and community donation support.
 * @author You
 */
contract UomiLifeline {
    address public owner;
    uint256 public dripAmount;
    uint256 public cooldownTime;
    uint256 public minBalance;
    mapping(address => uint256) public lastClaimed;

    event TokensClaimed(address indexed user, uint256 amount);
    event DonationReceived(address indexed donor, uint256 amount);
    event DripAdjusted(uint256 newDrip);

    modifier onlyEOA() {
        require(msg.sender == tx.origin, "No bots or contracts");
        _;
    }

    constructor(
        uint256 _dripAmount,
        uint256 _cooldownTime,
        uint256 _minBalance
    ) {
        owner = msg.sender;
        dripAmount = _dripAmount;
        cooldownTime = _cooldownTime;
        minBalance = _minBalance;
    }

    receive() external payable {
        emit DonationReceived(msg.sender, msg.value);
    }

    function claim() external onlyEOA {
        require(block.timestamp >= lastClaimed[msg.sender] + cooldownTime, "Wait before claiming again");
        require(address(this).balance >= dripAmount, "Faucet dry, donate!");

        uint256 amount = dripAmount;

        if (address(this).balance < minBalance) {
            amount = dripAmount / 2; // reduce drip when low balance
            emit DripAdjusted(amount);
        }

        lastClaimed[msg.sender] = block.timestamp;
        payable(msg.sender).transfer(amount);

        emit TokensClaimed(msg.sender, amount);
    }

    function donate() external payable {
        require(msg.value > 0, "Send something");
        emit DonationReceived(msg.sender, msg.value);
    }

    function updateConfig(uint256 _dripAmount, uint256 _cooldownTime, uint256 _minBalance) external {
        require(msg.sender == owner, "Not owner");
        dripAmount = _dripAmount;
        cooldownTime = _cooldownTime;
        minBalance = _minBalance;
    }
}
