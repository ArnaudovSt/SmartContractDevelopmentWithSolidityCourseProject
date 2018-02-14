pragma solidity ^0.4.18;

import './abstractions/IDDNSCore.sol';
import './DDNSBanking.sol';
import './common/SafeMath.sol';
import './common/Destructible.sol';

contract DDNSCore is DDNSBanking, Destructible, IDDNSCore {
    using SafeMath for uint256;

    event LogNewDomain(bytes32 _domainName, bytes32 _ipAddress, address indexed _domainOwner, bytes12 _topLevelDomain);

    event LogRegistrationRenewed(bytes32 indexed _domainName, bytes32 _ipAddress, uint256 _validUntil, address indexed _domainOwner, bytes12 _topLevelDomain);

    event LogEditedDomain(bytes32 indexed _domainName, bytes32 _newIpAddress);

    event LogOwnershipTransfer(bytes32 _domainName, address indexed _from, address indexed _to);

    struct DomainDetails {
        bytes32 ipAddress;
        uint256 validUntil;
        address domainOwner;
        bytes12 topLevelDomain;
    }

    mapping(bytes32 => DomainDetails) public domains;

    modifier priced(bytes32 _domainName) {
        require(msg.value >= _adjustPrice(_domainName));
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
        priced(_domainName)
    {
        require(_domainName[5] != 0);

        DomainDetails memory currentDomain = domains[_domainName];

        require(currentDomain.validUntil < now);

        domains[_domainName] = DomainDetails(_ipAddress, now.add(expiryPeriod), msg.sender, _topLevelDomain);

        if (currentDomain.validUntil == 0) {
            LogNewDomain(_domainName, _ipAddress, msg.sender, _topLevelDomain);
        }
    }

    function renewDomainRegistration(bytes32 _domainName)
        public
        payable
        priced(_domainName)
        onlyDomainOwner(_domainName)
    {
        uint256 currentPrice = _adjustPrice(_domainName);
        require(msg.value >= currentPrice);

        domains[_domainName].validUntil = domains[_domainName].validUntil.add(1 years);

        LogRegistrationRenewed(_domainName, domains[_domainName].ipAddress, domains[_domainName].validUntil, domains[_domainName].domainOwner, domains[_domainName].topLevelDomain);
    }

    function editDomainIp(bytes32 _domainName, bytes32 _newIpAddress)
        public
        onlyDomainOwner(_domainName)
    {
        domains[_domainName].ipAddress = _newIpAddress;
        LogEditedDomain(_domainName, _newIpAddress);
    }

    function transferOwnership(bytes32 _domainName, address _to)
        public
        onlyDomainOwner(_domainName)
    {
        domains[_domainName].domainOwner = _to;
        LogOwnershipTransfer(_domainName, msg.sender, _to);
    }

    function _adjustPrice(bytes32 _domainName) private view returns (uint256) {
        if (_domainName[9] == 0) {
            uint8 multiplier = 1;
            while (_domainName[9 - multiplier] == 0) {
                multiplier++;
            }
            return registrationCost.add(registrationCost.div(multiplier * 10));
        }
        return registrationCost;
    }
}