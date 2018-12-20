pragma solidity ^0.4.24;

import "../thank-you-token/CompanyThankYouToken.sol";

contract CompanyThankYouTokenTest is CompanyThankYouToken {

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
        CompanyThankYouToken(
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

    function setTotalSupplySyncedTest() public {
        super.setTotalSupplySynced();
    }
}
