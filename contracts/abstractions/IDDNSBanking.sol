pragma solidity ^0.4.18;

interface IDDNSBanking {
    function changeRegistrationCost(uint256 _newPrice) public;

    function changeExpiryPeriod(uint256 _newPeriod) public;

    function changeWalletAddress(address _newWalletAddress) public;

    function withdraw(uint256 _amount) public;
}