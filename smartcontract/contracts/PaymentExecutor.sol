// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./CurrencyConverter.sol";

contract PaymentExecutor is Ownable, ReentrancyGuard {
    CurrencyConverter public currencyConverter;
    
    // Mapping pour stocker les adresses des tokens ERC20
    mapping(string => address) public tokenAddresses;
    
    event PaymentExecuted(
        address indexed recipient,
        string currency,
        uint256 amount
    );
    
    constructor(address _currencyConverter) {
        currencyConverter = CurrencyConverter(_currencyConverter);
    }
    
    // Fonction pour transférer des ETH
    function transferETH(address recipient, uint256 amount) external onlyOwner nonReentrant {
        require(recipient != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be greater than 0");
        require(address(this).balance >= amount, "Insufficient ETH balance");
        
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "ETH transfer failed");
        
        emit PaymentExecuted(recipient, currencyConverter.ETH(), amount);
    }
    
    // Fonction pour transférer des tokens ERC20
    function transferToken(
        string memory currency,
        address recipient,
        uint256 amount
    ) external onlyOwner nonReentrant {
        require(recipient != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be greater than 0");
        
        address tokenAddress = tokenAddresses[currency];
        require(tokenAddress != address(0), "Token not configured");
        
        IERC20 token = IERC20(tokenAddress);
        require(token.balanceOf(address(this)) >= amount, "Insufficient token balance");
        require(token.transfer(recipient, amount), "Token transfer failed");
        
        emit PaymentExecuted(recipient, currency, amount);
    }
    
    // Fonction pour convertir et transférer
    function convertAndTransfer(
        string memory fromCurrency,
        string memory toCurrency,
        uint256 amount,
        address recipient
    ) external onlyOwner nonReentrant {
        require(recipient != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be greater than 0");
        require(currencyConverter.isPairSupported(fromCurrency, toCurrency), "Currency pair not supported");
        
        // Convertir le montant
        uint256 convertedAmount = currencyConverter.convert(fromCurrency, toCurrency, amount);
        
        // Transférer selon la devise de destination
        if (keccak256(bytes(toCurrency)) == keccak256(bytes(currencyConverter.ETH()))) {
            require(address(this).balance >= convertedAmount, "Insufficient ETH balance");
            (bool success, ) = recipient.call{value: convertedAmount}("");
            require(success, "ETH transfer failed");
        } else {
            address tokenAddress = tokenAddresses[toCurrency];
            require(tokenAddress != address(0), "Token not configured");
            
            IERC20 token = IERC20(tokenAddress);
            require(token.balanceOf(address(this)) >= convertedAmount, "Insufficient token balance");
            require(token.transfer(recipient, convertedAmount), "Token transfer failed");
        }
        
        emit PaymentExecuted(recipient, toCurrency, convertedAmount);
    }
    
    // Fonction pour mettre à jour l'adresse d'un token
    function setTokenAddress(string memory currency, address tokenAddress) external onlyOwner {
        require(tokenAddress != address(0), "Invalid token address");
        tokenAddresses[currency] = tokenAddress;
    }
    
    // Fonction pour recevoir des ETH
    receive() external payable {}
} 