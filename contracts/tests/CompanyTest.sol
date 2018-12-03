pragma solidity ^0.4.24;

import "../Company.sol";

contract CompanyTest is Company {

    constructor(
        address _managementAddress,
        address _rewardExchangeAddress,
        uint256 _startAt,
        uint256 _periodDuration,
        uint256 _periodTokenSupply,
        string _name,
        uint8 _decimals
    )
        public
        Company(
            _managementAddress,
            _rewardExchangeAddress,
            _startAt,
            _periodDuration,
            _periodTokenSupply,
            _name,
            _decimals
        )
    {

    }

    function changeStartAtTest(uint256 _startAt) public returns(uint256) {
        startAt = _startAt;
    }
}
