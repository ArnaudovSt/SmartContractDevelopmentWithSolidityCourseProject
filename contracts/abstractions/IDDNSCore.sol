pragma solidity ^0.4.18;

interface IDDNSCore {
    function registerDomain(bytes32 _domainName, bytes32 _ipAddress) public payable;

    function editDomainIp(bytes32 _domainName, bytes32 _newIpAddress) public;

    function transferOwnership(bytes32 _domainName, address _to) public;
}