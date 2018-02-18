pragma solidity ^0.4.18;

interface IDDNSCore {
	function registerDomain(bytes32 _domainName, bytes32 _ipAddress, bytes12 _topLevelDomain) public payable;

	function renewDomainRegistration(bytes32 _domainName) public payable;

	function editDomainIp(bytes32 _domainName, bytes32 _newIpAddress) public;

	function transferOwnership(bytes32 _domainName, address _to) public;
}