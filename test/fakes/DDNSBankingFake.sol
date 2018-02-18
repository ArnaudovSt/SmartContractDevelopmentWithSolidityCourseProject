pragma solidity ^0.4.18;

import '../../contracts/DDNSBanking.sol';


contract DDNSBankingFake is DDNSBanking {
	function () public payable {}
}