pragma solidity ^0.4.18;

interface IDDNSCore {
	function registerDomain(bytes32 _domainName, bytes32 _ipAddress, bytes12 _topLevelDomain) public payable;

	function renewDomainRegistration(bytes32 _domainName, bytes12 _topLevelDomain) public payable;

	function editDomainIp(bytes32 _domainName, bytes12 _topLevelDomain, bytes32 _newIpAddress) public;

	function transferOwnership(bytes32 _domainName, bytes12 _topLevelDomain, address _to) public;

	function getDomainPrice(bytes32 _domainName) public view returns (uint256);

	function getDomainKey(bytes32 _domainName, bytes12 _topLevelDomain) public pure returns (bytes32);
}