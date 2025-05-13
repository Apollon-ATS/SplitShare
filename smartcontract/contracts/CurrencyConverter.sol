// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract CurrencyConverter is Ownable {
    // Devises européennes
    string public constant EUR = "EUR";  // Euro
    string public constant GBP = "GBP";  // Livre sterling
    string public constant CHF = "CHF";  // Franc suisse
    string public constant SEK = "SEK";  // Couronne suédoise
    string public constant NOK = "NOK";  // Couronne norvégienne
    string public constant DKK = "DKK";  // Couronne danoise
    string public constant PLN = "PLN";  // Złoty polonais
    string public constant CZK = "CZK";  // Couronne tchèque
    string public constant HUF = "HUF";  // Forint hongrois
    
    // Devises américaines
    string public constant USD = "USD";  // Dollar américain
    string public constant CAD = "CAD";  // Dollar canadien
    string public constant MXN = "MXN";  // Peso mexicain
    string public constant BRL = "BRL";  // Real brésilien
    string public constant ARS = "ARS";  // Peso argentin
    string public constant CLP = "CLP";  // Peso chilien
    
    // Devises asiatiques
    string public constant JPY = "JPY";  // Yen japonais
    string public constant CNY = "CNY";  // Yuan chinois
    string public constant HKD = "HKD";  // Dollar de Hong Kong
    string public constant SGD = "SGD";  // Dollar de Singapour
    string public constant KRW = "KRW";  // Won sud-coréen
    string public constant INR = "INR";  // Roupie indienne
    string public constant TWD = "TWD";  // Dollar taïwanais
    
    // Devises du Moyen-Orient et Afrique
    string public constant AED = "AED";  // Dirham des Émirats arabes unis
    string public constant SAR = "SAR";  // Riyal saoudien
    string public constant ZAR = "ZAR";  // Rand sud-africain
    string public constant ILS = "ILS";  // Shekel israélien
    string public constant TRY = "TRY";  // Lire turque
    string public constant EGP = "EGP";  // Livre égyptienne
    
    // Devises océaniques
    string public constant AUD = "AUD";  // Dollar australien
    string public constant NZD = "NZD";  // Dollar néo-zélandais
    
    // Cryptomonnaies principales
    string public constant ETH = "ETH";
    string public constant BTC = "BTC";
    string public constant BNB = "BNB";
    string public constant SOL = "SOL";
    string public constant XRP = "XRP";
    string public constant ADA = "ADA";
    string public constant AVAX = "AVAX";
    string public constant DOT = "DOT";
    string public constant MATIC = "MATIC";
    string public constant LINK = "LINK";
    
    // Stablecoins
    string public constant USDT = "USDT";
    string public constant USDC = "USDC";
    string public constant DAI = "DAI";
    string public constant BUSD = "BUSD";
    string public constant TUSD = "TUSD";
    
    // Autres cryptomonnaies populaires
    string public constant DOGE = "DOGE";
    string public constant SHIB = "SHIB";
    string public constant LTC = "LTC";
    string public constant UNI = "UNI";
    string public constant AAVE = "AAVE";
    string public constant ATOM = "ATOM";
    string public constant EOS = "EOS";
    string public constant TRX = "TRX";
    string public constant XLM = "XLM";
    string public constant XMR = "XMR";
    
    // Mapping des paires de devises vers les oracles Chainlink
    mapping(string => mapping(string => address)) public priceFeeds;
    
    // Mapping pour stocker les décimales de chaque devise
    mapping(string => uint8) public decimals;
    
    // Constante pour le nombre maximum de décimales
    uint8 public constant MAX_DECIMALS = 18;
    
    event ConversionRateUpdated(string fromCurrency, string toCurrency, uint256 rate);
    event DecimalsUpdated(string currency, uint8 decimals);
    
    constructor() {
        // Initialisation des décimales pour les devises européennes
        decimals[EUR] = MAX_DECIMALS;
        decimals[GBP] = MAX_DECIMALS;
        decimals[CHF] = MAX_DECIMALS;
        decimals[SEK] = MAX_DECIMALS;
        decimals[NOK] = MAX_DECIMALS;
        decimals[DKK] = MAX_DECIMALS;
        decimals[PLN] = MAX_DECIMALS;
        decimals[CZK] = MAX_DECIMALS;
        decimals[HUF] = MAX_DECIMALS;
        
        // Initialisation des décimales pour les devises américaines
        decimals[USD] = MAX_DECIMALS;
        decimals[CAD] = MAX_DECIMALS;
        decimals[MXN] = MAX_DECIMALS;
        decimals[BRL] = MAX_DECIMALS;
        decimals[ARS] = MAX_DECIMALS;
        decimals[CLP] = MAX_DECIMALS;
        
        // Initialisation des décimales pour les devises asiatiques
        decimals[JPY] = MAX_DECIMALS;
        decimals[CNY] = MAX_DECIMALS;
        decimals[HKD] = MAX_DECIMALS;
        decimals[SGD] = MAX_DECIMALS;
        decimals[KRW] = MAX_DECIMALS;
        decimals[INR] = MAX_DECIMALS;
        decimals[TWD] = MAX_DECIMALS;
        
        // Initialisation des décimales pour les devises du Moyen-Orient et Afrique
        decimals[AED] = MAX_DECIMALS;
        decimals[SAR] = MAX_DECIMALS;
        decimals[ZAR] = MAX_DECIMALS;
        decimals[ILS] = MAX_DECIMALS;
        decimals[TRY] = MAX_DECIMALS;
        decimals[EGP] = MAX_DECIMALS;
        
        // Initialisation des décimales pour les devises océaniques
        decimals[AUD] = MAX_DECIMALS;
        decimals[NZD] = MAX_DECIMALS;
        
        // Initialisation des décimales pour les cryptomonnaies
        decimals[ETH] = MAX_DECIMALS;
        decimals[BTC] = MAX_DECIMALS;
        decimals[BNB] = MAX_DECIMALS;
        decimals[SOL] = MAX_DECIMALS;
        decimals[XRP] = MAX_DECIMALS;
        decimals[ADA] = MAX_DECIMALS;
        decimals[AVAX] = MAX_DECIMALS;
        decimals[DOT] = MAX_DECIMALS;
        decimals[MATIC] = MAX_DECIMALS;
        decimals[LINK] = MAX_DECIMALS;
        
        // Initialisation des décimales pour les stablecoins
        decimals[USDT] = MAX_DECIMALS;
        decimals[USDC] = MAX_DECIMALS;
        decimals[DAI] = MAX_DECIMALS;
        decimals[BUSD] = MAX_DECIMALS;
        decimals[TUSD] = MAX_DECIMALS;
        
        // Initialisation des décimales pour les autres cryptomonnaies
        decimals[DOGE] = MAX_DECIMALS;
        decimals[SHIB] = MAX_DECIMALS;
        decimals[LTC] = MAX_DECIMALS;
        decimals[UNI] = MAX_DECIMALS;
        decimals[AAVE] = MAX_DECIMALS;
        decimals[ATOM] = MAX_DECIMALS;
        decimals[EOS] = MAX_DECIMALS;
        decimals[TRX] = MAX_DECIMALS;
        decimals[XLM] = MAX_DECIMALS;
        decimals[XMR] = MAX_DECIMALS;
    }
    
    // Fonction pour ajouter ou mettre à jour un oracle de prix
    function setPriceFeed(string memory fromCurrency, string memory toCurrency, address priceFeedAddress) external onlyOwner {
        priceFeeds[fromCurrency][toCurrency] = priceFeedAddress;
    }
    
    // Fonction pour mettre à jour les décimales d'une devise
    function setDecimals(string memory currency, uint8 _decimals) external onlyOwner {
        require(_decimals <= MAX_DECIMALS, "Too many decimals");
        decimals[currency] = _decimals;
        emit DecimalsUpdated(currency, _decimals);
    }
    
    // Fonction pour obtenir le taux de conversion avec précision maximale
    function getConversionRate(string memory fromCurrency, string memory toCurrency, uint256 amount) public view returns (uint256) {
        address priceFeedAddress = priceFeeds[fromCurrency][toCurrency];
        require(priceFeedAddress != address(0), "Price feed not found");
        
        AggregatorV3Interface priceFeed = AggregatorV3Interface(priceFeedAddress);
        (, int256 price,,,) = priceFeed.latestRoundData();
        
        // Utilisation de la précision maximale pour les calculs
        uint256 scaledAmount = amount * (10 ** MAX_DECIMALS);
        uint256 scaledPrice = uint256(price) * (10 ** MAX_DECIMALS);
        
        // Calcul avec précision maximale
        return (scaledAmount * scaledPrice) / (10 ** MAX_DECIMALS);
    }
    
    // Fonction pour convertir un montant avec précision maximale
    function convert(string memory fromCurrency, string memory toCurrency, uint256 amount) external view returns (uint256) {
        return getConversionRate(fromCurrency, toCurrency, amount);
    }
    
    // Fonction pour vérifier si une paire de devises est supportée
    function isPairSupported(string memory fromCurrency, string memory toCurrency) external view returns (bool) {
        return priceFeeds[fromCurrency][toCurrency] != address(0);
    }
    
    // Fonction pour obtenir le nombre de décimales d'une devise
    function getDecimals(string memory currency) external view returns (uint8) {
        return decimals[currency];
    }
    
    // Fonction pour obtenir la liste de toutes les devises supportées
    function getSupportedCurrencies() external pure returns (string[] memory) {
        string[] memory currencies = new string[](50);
        uint256 index = 0;
        
        // Devises européennes
        currencies[index++] = EUR;
        currencies[index++] = GBP;
        currencies[index++] = CHF;
        currencies[index++] = SEK;
        currencies[index++] = NOK;
        currencies[index++] = DKK;
        currencies[index++] = PLN;
        currencies[index++] = CZK;
        currencies[index++] = HUF;
        
        // Devises américaines
        currencies[index++] = USD;
        currencies[index++] = CAD;
        currencies[index++] = MXN;
        currencies[index++] = BRL;
        currencies[index++] = ARS;
        currencies[index++] = CLP;
        
        // Devises asiatiques
        currencies[index++] = JPY;
        currencies[index++] = CNY;
        currencies[index++] = HKD;
        currencies[index++] = SGD;
        currencies[index++] = KRW;
        currencies[index++] = INR;
        currencies[index++] = TWD;
        
        // Devises du Moyen-Orient et Afrique
        currencies[index++] = AED;
        currencies[index++] = SAR;
        currencies[index++] = ZAR;
        currencies[index++] = ILS;
        currencies[index++] = TRY;
        currencies[index++] = EGP;
        
        // Devises océaniques
        currencies[index++] = AUD;
        currencies[index++] = NZD;
        
        // Cryptomonnaies principales
        currencies[index++] = ETH;
        currencies[index++] = BTC;
        currencies[index++] = BNB;
        currencies[index++] = SOL;
        currencies[index++] = XRP;
        currencies[index++] = ADA;
        currencies[index++] = AVAX;
        currencies[index++] = DOT;
        currencies[index++] = MATIC;
        currencies[index++] = LINK;
        
        // Stablecoins
        currencies[index++] = USDT;
        currencies[index++] = USDC;
        currencies[index++] = DAI;
        currencies[index++] = BUSD;
        currencies[index++] = TUSD;
        
        // Autres cryptomonnaies
        currencies[index++] = DOGE;
        currencies[index++] = SHIB;
        currencies[index++] = LTC;
        currencies[index++] = UNI;
        currencies[index++] = AAVE;
        currencies[index++] = ATOM;
        currencies[index++] = EOS;
        currencies[index++] = TRX;
        currencies[index++] = XLM;
        currencies[index++] = XMR;
        
        return currencies;
    }
} 