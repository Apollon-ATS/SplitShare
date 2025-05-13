// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./CurrencyConverter.sol";

contract PaymentProcessor is Ownable, ReentrancyGuard {
    CurrencyConverter public currencyConverter;
    PaymentExecutor public paymentExecutor;
    
    struct PaymentRequest {
        address sender;
        string fromCurrency;
        string toCurrency;
        uint256 amount;
        address recipient;
        bool isProcessed;
        uint256 timestamp;
    }
    
    // Mapping pour stocker les demandes de paiement
    mapping(uint256 => PaymentRequest) public paymentRequests;
    uint256 public paymentRequestCount;
    
    // Mapping pour stocker les adresses des tokens ERC20
    mapping(string => address) public tokenAddresses;
    
    event PaymentRequestCreated(
        uint256 indexed requestId,
        address indexed sender,
        string fromCurrency,
        string toCurrency,
        uint256 amount,
        address recipient
    );
    
    event PaymentProcessed(
        uint256 indexed requestId,
        address indexed recipient,
        uint256 amount,
        string currency
    );
    
    constructor(address _currencyConverter, address _paymentExecutor) {
        currencyConverter = CurrencyConverter(_currencyConverter);
        paymentExecutor = PaymentExecutor(_paymentExecutor);
    }
    
    // Fonction pour créer une demande de paiement en ETH
    function createPaymentRequestETH(
        string memory toCurrency,
        uint256 amount,
        address recipient
    ) external payable nonReentrant {
        require(msg.value > 0, "Amount must be greater than 0");
        require(recipient != address(0), "Invalid recipient address");
        require(currencyConverter.isPairSupported(currencyConverter.ETH(), toCurrency), "Currency pair not supported");
        
        uint256 requestId = paymentRequestCount++;
        paymentRequests[requestId] = PaymentRequest({
            sender: msg.sender,
            fromCurrency: currencyConverter.ETH(),
            toCurrency: toCurrency,
            amount: msg.value,
            recipient: recipient,
            isProcessed: false,
            timestamp: block.timestamp
        });
        
        emit PaymentRequestCreated(
            requestId,
            msg.sender,
            currencyConverter.ETH(),
            toCurrency,
            msg.value,
            recipient
        );
    }
    
    // Fonction pour créer une demande de paiement en token ERC20
    function createPaymentRequestToken(
        string memory fromCurrency,
        string memory toCurrency,
        uint256 amount,
        address recipient
    ) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(recipient != address(0), "Invalid recipient address");
        require(currencyConverter.isPairSupported(fromCurrency, toCurrency), "Currency pair not supported");
        
        address tokenAddress = tokenAddresses[fromCurrency];
        require(tokenAddress != address(0), "Token not configured");
        
        IERC20 token = IERC20(tokenAddress);
        require(token.transferFrom(msg.sender, address(this), amount), "Token transfer failed");
        
        uint256 requestId = paymentRequestCount++;
        paymentRequests[requestId] = PaymentRequest({
            sender: msg.sender,
            fromCurrency: fromCurrency,
            toCurrency: toCurrency,
            amount: amount,
            recipient: recipient,
            isProcessed: false,
            timestamp: block.timestamp
        });
        
        emit PaymentRequestCreated(
            requestId,
            msg.sender,
            fromCurrency,
            toCurrency,
            amount,
            recipient
        );
    }
    
    // Fonction pour traiter une demande de paiement (uniquement le propriétaire)
    function processPaymentRequest(uint256 requestId) external onlyOwner nonReentrant {
        PaymentRequest storage request = paymentRequests[requestId];
        require(!request.isProcessed, "Request already processed");
        
        request.isProcessed = true;
        
        // Convertir et transférer via PaymentExecutor
        paymentExecutor.convertAndTransfer(
            request.fromCurrency,
            request.toCurrency,
            request.amount,
            request.recipient
        );
        
        emit PaymentProcessed(
            requestId,
            request.recipient,
            request.amount,
            request.toCurrency
        );
    }
    
    // Fonction pour mettre à jour l'adresse d'un token
    function setTokenAddress(string memory currency, address tokenAddress) external onlyOwner {
        require(tokenAddress != address(0), "Invalid token address");
        tokenAddresses[currency] = tokenAddress;
    }
    
    // Fonction pour obtenir les détails d'une demande de paiement
    function getPaymentRequest(uint256 requestId) external view returns (
        address sender,
        string memory fromCurrency,
        string memory toCurrency,
        uint256 amount,
        address recipient,
        bool isProcessed,
        uint256 timestamp
    ) {
        PaymentRequest storage request = paymentRequests[requestId];
        return (
            request.sender,
            request.fromCurrency,
            request.toCurrency,
            request.amount,
            request.recipient,
            request.isProcessed,
            request.timestamp
        );
    }
    
    // Fonction pour recevoir des ETH
    receive() external payable {}
} 