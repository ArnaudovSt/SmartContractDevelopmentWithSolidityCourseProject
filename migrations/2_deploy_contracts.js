const SafeMath = artifacts.require("../contracts/common/SafeMath.sol");
const DDNSCore = artifacts.require("../contracts/DDNSCore.sol");

module.exports = (deployer) => {
    deployer.deploy(SafeMath);
    deployer.link(SafeMath, DDNSCore);
    deployer.deploy(DDNSCore);

};
