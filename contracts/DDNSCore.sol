pragma solidity ^0.4.18;

import './DDNSBanking.sol';
import './common/SafeMath.sol';
import './common/Destructible.sol';


contract DDNSCore is DDNSBanking, Destructible {
	using SafeMath for uint256;

	event LogNewDomain(
		bytes32 domainName,
		bytes32 ipAddress,
		address indexed domainOwner,
		bytes12 topLevelDomain
	);

	event LogRegistrationRenewed(
		bytes32 indexed domainName,
		bytes32 ipAddress,
		uint256 validUntil,
		address indexed domainOwner,
		bytes12 topLevelDomain
	);

	event LogEditedDomain(
		bytes32 indexed domainName,
		bytes12 topLevelDomain,
		bytes32 newIpAddress
	);

	event LogOwnershipTransfer(
		bytes32 domainName,
		bytes12 topLevelDomain,
		address indexed from,
		address indexed to
	);

	event LogReceipt(
		address indexed receiver,
		bytes32 domainName,
		uint256 amountPaid,
		uint256 timeBought
	);

	struct DomainDetails {
		bytes32 domainName;
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

	modifier onlyDomainOwner(bytes32 _domainName, bytes12 _topLevelDomain) {
		bytes32 key = getDomainKey(_domainName, _topLevelDomain);
		require(domains[key].domainOwner == msg.sender);
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
		bytes32 key = getDomainKey(_domainName, _topLevelDomain);
		
		/* solium-disable-next-line security/no-block-members */
		require(domains[key].validUntil < now);

		if (_isNewDomainRegistration(key)) {
			LogNewDomain(_domainName, _ipAddress, msg.sender, _topLevelDomain);
		}

		/* solium-disable-next-line security/no-block-members */
		domains[key] = DomainDetails(_domainName, _ipAddress, now.add(expiryPeriod), msg.sender, _topLevelDomain);

		_issueReceipt(_domainName);
	}

	function renewDomainRegistration(bytes32 _domainName, bytes12 _topLevelDomain)
		public
		payable
		nameLengthPriced(_domainName)
		onlyDomainOwner(_domainName, _topLevelDomain)
	{
		bytes32 key = getDomainKey(_domainName, _topLevelDomain);
		/* solium-disable-next-line security/no-block-members */
		require(domains[key].validUntil > now);

		domains[key].validUntil = domains[key].validUntil.add(expiryPeriod);

		LogRegistrationRenewed(
			_domainName,
			domains[key].ipAddress,
			domains[key].validUntil,
			domains[key].domainOwner,
			domains[key].topLevelDomain
		);

		_issueReceipt(_domainName);
	}

	function editDomainIp(bytes32 _domainName, bytes12 _topLevelDomain, bytes32 _newIpAddress)
		public
		onlyDomainOwner(_domainName, _topLevelDomain)
		ipAddressLengthRestricted(_newIpAddress)
	{
		bytes32 key = getDomainKey(_domainName, _topLevelDomain);
		domains[key].ipAddress = _newIpAddress;
		LogEditedDomain(_domainName, _topLevelDomain, _newIpAddress);
	}

	function transferOwnership(bytes32 _domainName, bytes12 _topLevelDomain, address _to)
		public
		onlyDomainOwner(_domainName, _topLevelDomain)
	{
		require(_to != address(0));

		bytes32 key = getDomainKey(_domainName, _topLevelDomain);

		domains[key].domainOwner = _to;
		LogOwnershipTransfer(_domainName, _topLevelDomain, msg.sender, _to);
	}

	function getDomainPrice(bytes32 _domainName) public view returns (uint256) {
		return _adjustPriceToNameLength(_domainName);
	}

	function getDomainKey(bytes32 _domainName, bytes12 _topLevelDomain) public pure returns (bytes32) {
		return keccak256(_domainName, _topLevelDomain);
	}

	function getReceipts(address _owner) public view returns (Receipt[]) {
		require(_owner != address(0));
		return receipts[_owner];
	}

	function _adjustPriceToNameLength(bytes32 _domainName) private view returns (uint256) {
		if (_domainName[PRICE_INCREASE_BOUND_INDEX] == BYTES_DEFAULT_VALUE) {
			uint8 multiplier = 1;
			while (_domainName[PRICE_INCREASE_BOUND_INDEX - multiplier] == BYTES_DEFAULT_VALUE) {
				multiplier++;
			}

			uint256 additionalTax = registrationCost.mul(multiplier * 10);
			additionalTax = additionalTax.div(100);
			return registrationCost.add(additionalTax);
		}
		return registrationCost;
	}

	function _isNewDomainRegistration(bytes32 _key) private view returns(bool) {
		return domains[_key].validUntil == 0;
	}

	function _issueReceipt(bytes32 _domainName) private {
		/* solium-disable-next-line security/no-block-members */
		receipts[msg.sender].push(Receipt(_domainName, msg.value, now));
		/* solium-disable-next-line security/no-block-members */
		LogReceipt(msg.sender, _domainName, msg.value, now);
	}
}