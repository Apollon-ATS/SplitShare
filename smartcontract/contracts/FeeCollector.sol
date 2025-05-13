// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract FeeCollector is Ownable, ReentrancyGuard {
    uint256 public feePercentage = 2; // 2% de frais
    address public feeCollector;
    
    event PaymentReceived(address indexed sender, uint256 amount, string currency);
    event FeeCollected(address indexed collector, uint256 amount, string currency);
    
    constructor(address _feeCollector) {
        feeCollector = _feeCollector;
    }
    
    // Fonction pour recevoir des ETH
    receive() external payable {
        uint256 fee = (msg.value * feePercentage) / 100;
        uint256 remainingAmount = msg.value - fee;
        
        // Envoyer les frais au collecteur
        (bool feeSuccess, ) = feeCollector.call{value: fee}("");
        require(feeSuccess, "Fee transfer failed");
        
        emit PaymentReceived(msg.sender, msg.value, "ETH");
        emit FeeCollected(feeCollector, fee, "ETH");
    }
    
    // Fonction pour recevoir des tokens ERC20
    function receiveTokens(address tokenAddress, uint256 amount) external nonReentrant {
        IERC20 token = IERC20(tokenAddress);
        require(token.transferFrom(msg.sender, address(this), amount), "Token transfer failed");
        
        uint256 fee = (amount * feePercentage) / 100;
        uint256 remainingAmount = amount - fee;
        
        // Envoyer les frais au collecteur
        require(token.transfer(feeCollector, fee), "Fee transfer failed");
        
        emit PaymentReceived(msg.sender, amount, "ERC20");
        emit FeeCollected(feeCollector, fee, "ERC20");
    }
    
    // Fonction pour mettre à jour le pourcentage de frais (uniquement le propriétaire)
    function updateFeePercentage(uint256 _newFeePercentage) external onlyOwner {
        require(_newFeePercentage <= 10, "Fee percentage too high");
        feePercentage = _newFeePercentage;
    }
    
    // Fonction pour mettre à jour l'adresse du collecteur de frais
    function updateFeeCollector(address _newFeeCollector) external onlyOwner {
        require(_newFeeCollector != address(0), "Invalid fee collector address");
        feeCollector = _newFeeCollector;
    }
} 