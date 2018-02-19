pragma solidity ^0.4.18;

import './abstractions/IDDNSCore.sol';
import './DDNSBanking.sol';
import './common/SafeMath.sol';
import './common/Destructible.sol';


contract DDNSCore is DDNSBanking, Destructible, IDDNSCore {
	using SafeMath for uint256;

	event LogNewDomain(
		bytes32 _domainName,
		bytes32 _ipAddress,
		address indexed _domainOwner,
		bytes12 _topLevelDomain
	);

	event LogRegistrationRenewed(
		bytes32 indexed _domainName,
		bytes32 _ipAddress,
		uint256 _validUntil,
		address indexed _domainOwner,
		bytes12 _topLevelDomain
	);

	event LogEditedDomain(
		bytes32 indexed _domainName,
		bytes32 _newIpAddress
	);

	event LogOwnershipTransfer(
		bytes32 _domainName,
		address indexed _from,
		address indexed _to
	);

	event LogReceipt(
		address indexed _receiver,
		bytes32 _domainName,
		uint256 _amountPaid,
		uint256 _timeBought
	);

	struct DomainDetails {
		bytes32 ipAddress;
		uint256 validUntil;
		address domainOwner;
		bytes12 topLevelDomain;
	}

	struct Receipt {
		bytes32 domainName;
		uint256 amountPaid;
		uint256 timeBought;
	}

	bytes1 public constant BYTES_DEFAULT_VALUE = bytes1(0x00);
	uint8 public constant DOMAIN_NAME_MIN_LENGTH = 5;
	uint8 public constant IP_ADDRESS_MIN_LENGTH = 6;
	uint8 public constant TOP_LEVEL_DOMAIN_MIN_LENGTH = 1;
	uint8 public constant PRICE_INCREASE_BOUND_INDEX = 9;

	mapping(bytes32 => DomainDetails) public domains;
	mapping(address => Receipt[]) public receipts;

	modifier nameLengthRestricted(bytes32 _domainName) {
		require(_domainName[DOMAIN_NAME_MIN_LENGTH] != BYTES_DEFAULT_VALUE);
		_;
	}

	modifier ipAddressLengthRestricted(bytes32 _ipAddress) {
		require(_ipAddress[IP_ADDRESS_MIN_LENGTH] != BYTES_DEFAULT_VALUE);
		_;
	}

	modifier topLevelDomainLengthRestricted(bytes12 _topLevelDomain) {
		require(_topLevelDomain[TOP_LEVEL_DOMAIN_MIN_LENGTH] != BYTES_DEFAULT_VALUE);
		_;
	}

	modifier nameLengthPriced(bytes32 _domainName) {
		require(msg.value >= _adjustPriceToNameLength(_domainName));
		_;
	}

	modifier onlyDomainOwner(bytes32 _domainName) {
		require(domains[_domainName].domainOwner == msg.sender);
		_;
	}

	function registerDomain(
		bytes32 _domainName,
		bytes32 _ipAddress,
		bytes12 _topLevelDomain
	)
		public
		payable
		nameLengthRestricted(_domainName)
		ipAddressLengthRestricted(_ipAddress)
		topLevelDomainLengthRestricted(_topLevelDomain)
		nameLengthPriced(_domainName)
	{
		/* solium-disable-next-line security/no-block-members */
		require(domains[_domainName].validUntil < now);

		if (_isNewDomainRegistration(_domainName)) {
			LogNewDomain(_domainName, _ipAddress, msg.sender, _topLevelDomain);
		}

		/* solium-disable-next-line security/no-block-members */
		domains[_domainName] = DomainDetails(_ipAddress, now.add(expiryPeriod), msg.sender, _topLevelDomain);

		_issueReceipt(_domainName);
	}

	function renewDomainRegistration(bytes32 _domainName)
		public
		payable
		nameLengthPriced(_domainName)
		onlyDomainOwner(_domainName)
	{
		domains[_domainName].validUntil = domains[_domainName].validUntil.add(expiryPeriod);

		LogRegistrationRenewed(
			_domainName,
			domains[_domainName].ipAddress,
			domains[_domainName].validUntil,
			domains[_domainName].domainOwner,
			domains[_domainName].topLevelDomain
		);

		_issueReceipt(_domainName);
	}

	function editDomainIp(bytes32 _domainName, bytes32 _newIpAddress)
		public
		onlyDomainOwner(_domainName)
		ipAddressLengthRestricted(_newIpAddress)
	{
		domains[_domainName].ipAddress = _newIpAddress;
		LogEditedDomain(_domainName, _newIpAddress);
	}

	function transferOwnership(bytes32 _domainName, address _to)
		public
		onlyDomainOwner(_domainName)
	{
		require(_to != address(0));
		domains[_domainName].domainOwner = _to;
		LogOwnershipTransfer(_domainName, msg.sender, _to);
	}

	function _adjustPriceToNameLength(bytes32 _domainName) private view returns (uint256) {
		if (_domainName[PRICE_INCREASE_BOUND_INDEX] == BYTES_DEFAULT_VALUE) {
			uint8 multiplier = 1;
			while (_domainName[PRICE_INCREASE_BOUND_INDEX - multiplier] == BYTES_DEFAULT_VALUE) {
				multiplier++;
			}
			return registrationCost.add(registrationCost.div(multiplier * 10));
		}
		return registrationCost;
	}

	function _isNewDomainRegistration(bytes32 _domainName) private view returns(bool) {
		return domains[_domainName].validUntil == 0;
	}

	function _issueReceipt(bytes32 _domainName) private {
		/* solium-disable-next-line security/no-block-members */
		Receipt memory receipt = Receipt(_domainName, msg.value, now);
		receipts[msg.sender].push(receipt);

		LogReceipt(msg.sender, _domainName, msg.value, receipt.timeBought);
	}
}