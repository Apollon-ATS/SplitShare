# Système de Transfert d'Argent Multi-Devises

Ce projet est un système de smart contracts permettant de faciliter les transferts d'argent entre différentes devises (fiat et crypto) sur la blockchain Ethereum.

## Architecture

Le système est composé de 4 contrats principaux :

1. **FeeCollector** : Premier point de contact qui reçoit les fonds et prélève les frais
2. **PaymentProcessor** : Gère les demandes de paiement et le traitement des transferts
3. **CurrencyConverter** : Gère les conversions entre différentes devises
4. **PaymentExecutor** : Exécute les transferts finaux vers les destinataires

## Fonctionnalités

- Transfert d'ETH et de tokens ERC20
- Conversion automatique entre différentes devises
- Support pour les devises fiat et crypto
- Prélèvement automatique des frais
- Gestion des taux de change via Chainlink
- Sécurité renforcée avec OpenZeppelin

## Installation

1. Cloner le repository
2. Installer les dépendances :
```bash
npm install
```

## Déploiement

1. Déployer les contrats dans l'ordre suivant :
   - CurrencyConverter
   - PaymentExecutor
   - PaymentProcessor
   - FeeCollector

2. Configurer les adresses des tokens et des oracles Chainlink

## Utilisation

### Envoi d'ETH

```solidity
// Envoyer 1 ETH et le convertir en USDT
feeCollector.receive{value: 1 ether}();
paymentProcessor.createPaymentRequestETH("USDT", 1 ether, recipientAddress);
```

### Envoi de Tokens

```solidity
// Envoyer 100 USDT et les convertir en EUR
IERC20(usdtAddress).approve(address(feeCollector), 100);
feeCollector.receiveTokens(usdtAddress, 100);
paymentProcessor.createPaymentRequestToken("USDT", "EUR", 100, recipientAddress);
```

## Sécurité

- Utilisation des contrats OpenZeppelin pour la sécurité
- Protection contre les attaques de réentrance
- Vérifications de sécurité pour les transferts
- Gestion des erreurs et des cas limites

## Tests

```bash
npx hardhat test
```

## Licence

MIT

## Configuration

- Le pourcentage de frais est configurable (par défaut 2%)
- Les oracles Chainlink peuvent être mis à jour
- Les adresses des contrats peuvent être mises à jour

## Développement

Pour compiler les contrats :
```bash
npx hardhat compile
```

Pour exécuter les tests :
```bash
npx hardhat test
``` 