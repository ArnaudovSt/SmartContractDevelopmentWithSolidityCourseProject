pragma solidity ^0.4.18;

import './modifiers/Owned.sol';
import './abstractions/IDDNSBanking.sol';

contract DDNSBanking is IDDNSBanking, Owned {
    uint256 public registrationCost = 1 ether;
    uint256 public expiryPeriod = 1 years;
    address public wallet = owner;

    function changeRegistrationCost(uint256 _newPrice) public onlyOwner {
        registrationCost = _newPrice;
    }

    function changeExpiryPeriod(uint256 _newPeriod) public onlyOwner {
        expiryPeriod = _newPeriod;
    }

    function changeWallet(address _newWallet) public onlyOwner {
        require(_newWallet != address(0));
        wallet = _newWallet;
    }

    function withdraw(uint256 _amount) public onlyOwner {
        require(this.balance >= _amount);
        wallet.transfer(_amount);
    }
}