pragma solidity ^0.4.18;

import './modifiers/Owned.sol';


contract DDNSBanking is Owned {
	event LogCostChange(
		uint256 newPrice
	);

	event LogExpiryPeriodChange(
		uint256 newPeriod
	);

	event LogWalletChange(
		address newWallet
	);

	event LogWithdrawal(
		address indexed invoker,
		address indexed wallet,
		uint256 amount
	);

	uint256 public registrationCost = 1 ether;
	uint256 public expiryPeriod = 1 years;
	address public wallet;

	function DDNSBanking() public {
		wallet = owner;
	}

	function changeRegistrationCost(uint256 _newPrice) public onlyOwner {
		registrationCost = _newPrice;
		LogCostChange(_newPrice);
	}

	function changeExpiryPeriod(uint256 _newPeriod) public onlyOwner {
		require(_newPeriod >= 1 weeks);
		expiryPeriod = _newPeriod;
		LogExpiryPeriodChange(_newPeriod);
	}

	function changeWallet(address _newWallet) public onlyOwner {
		require(_newWallet != address(0));
		wallet = _newWallet;
		LogWalletChange(_newWallet);
	}

	function withdraw(uint256 _amount) public onlyOwner {
		require(this.balance >= _amount);
		wallet.transfer(_amount);
		LogWithdrawal(owner, wallet, _amount);
	}
}