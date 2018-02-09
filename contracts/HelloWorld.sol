pragma solidity ^0.4.18;

contract HelloWorld {
    function greet() public pure returns (bytes32) {
        return "HelloWorld!";
    }
}