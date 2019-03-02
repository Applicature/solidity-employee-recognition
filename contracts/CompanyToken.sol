pragma solidity ^0.4.24;

import "./thank-you-token/CompanyThankYouToken.sol";


contract CompanyToken is CompanyThankYouToken {

    uint256 public defaultInitialBalance;

    mapping(
        uint256 => mapping(address => uint256[2])
    ) periodHolderInitialAndSpentBalances;

    mapping(uint256 => mapping (address => bool)) userTokenClaimsPerPeriod;

    constructor(
        address _managementAddress,
        address _rewardExchangeAddress,
        uint256 _startAt,
        uint256 _periodDuration,
        uint256 _periodTokenSupply,
        string _name,
        uint8 _decimals,
        uint256 _initialBalance
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
        requireContractExistsInRegistry(CONTRACT_COMPANY_FABRIC)
        canCallOnlyRegisteredContract(CONTRACT_COMPANY_FABRIC)
    {
        require(_initialBalance > 0, ERROR_WRONG_AMOUNT);
        defaultInitialBalance = _initialBalance;
    }

    function updateInitialBalanceValue(uint256 _newValue)
        public
        requirePermission(CAN_UPDATE_STATE)
    {
        require(_newValue > 0, ERROR_WRONG_AMOUNT);

        defaultInitialBalance = _newValue;
    }

    function calculateTokensAmount(
        address _forAddress
    )
        public
        view
        returns (uint256)
    {
        uint256 currentPeriod = getCurrentPeriod();

        if (currentPeriod == 0) {
            return defaultInitialBalance;
        }

        uint256 prevPeriodInitialBalance = periodHolderInitialAndSpentBalances[
            currentPeriod.sub(1)
        ][_forAddress][0];

        if (prevPeriodInitialBalance == 0) {
            return defaultInitialBalance;
        }

        uint256 prevPeriodSpentBalance = periodHolderInitialAndSpentBalances[
            currentPeriod.sub(1)
        ][_forAddress][1];

        if (prevPeriodSpentBalance > prevPeriodInitialBalance) {
            prevPeriodSpentBalance = prevPeriodInitialBalance;
        }

        //previous initial balance * 2 * % spent tokens
        return prevPeriodInitialBalance.mul(2).mul(
            prevPeriodSpentBalance.mul(100).div(prevPeriodInitialBalance)
        ).div(100);
    }

    function isGeneratedDataTimestampValid(
        uint256 _timestamp
    )
        public
        view
        returns (bool)
    {
        uint256 currentPeriod = getCurrentPeriod();
        uint256 currentPeriodStartAt = startAt;

        if (currentPeriod > 0) {
            currentPeriodStartAt = startAt.add(currentPeriod.sub(1).mul(periodDuration));
        }

        return (
            currentPeriodStartAt <= _timestamp &&
            _timestamp <= currentPeriodStartAt.add(periodDuration)
        );
    }

    function claimTokens(
        uint256 _dataGenerationTimestamp,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    )
        public
    {
        address recoveredAddress = verify(
            msg.sender,
            _dataGenerationTimestamp,
            _v,
            _r,
            _s
        );
        require(
            hasPermission(recoveredAddress, CAN_SIGN_TRANSACTION),
            ERROR_ACCESS_DENIED
        );

        require(
            isGeneratedDataTimestampValid(_dataGenerationTimestamp) == true,
            ERROR_NOT_AVAILABLE
        );

        updateCompanyState();
        require(isRecognitionPeriodsInProgress(), ERROR_ACCESS_DENIED);

        if (!isTotalSupplySynced()) {
            setTotalSupplySynced();
        }

        //Only one claim per period allowed
        require(
            userTokenClaimsPerPeriod[getCurrentPeriod()][msg.sender] == false,
            ERROR_ACCESS_DENIED
        );

        userTokenClaimsPerPeriod[getCurrentPeriod()][msg.sender] = true;

        uint256 tokensAmount = calculateTokensAmount(msg.sender);

        require(tokensAmount > 0, ERROR_WRONG_AMOUNT);

        mintInternal(msg.sender, tokensAmount);

        setHolderInitialBalance(msg.sender, tokensAmount);
    }

    function verify(
        address _sender,
        uint256 _dataGenerationTimestamp,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    )
        public
        pure
        returns (address)
    {
        bytes32 hash = keccak256(
            abi.encodePacked(_sender, _dataGenerationTimestamp)
        );

        bytes memory prefix = "\x19Ethereum Signed Message:\n32";

        return ecrecover(
            keccak256(abi.encodePacked(prefix, hash)),
            _v,
            _r,
            _s
        );
    }

    function transfer(address _to, uint256 _value) public returns (bool) {
        if (_to != rewardExchangeAddress) {
            increaseSpentTokens(msg.sender, _value);
        }
        require(super.transfer(_to, _value) == true, ERROR_NOT_AVAILABLE);
    }

    function transferFrom(
        address _from,
        address _to,
        uint256 _value
    )
        public
        returns (bool)
    {
        if (_to != rewardExchangeAddress) {
            increaseSpentTokens(_from, _value);
        }
        require(
            super.transferFrom(_from, _to, _value) == true,
            ERROR_NOT_AVAILABLE
        );
    }

    function increaseSpentTokens(
        address _holder,
        uint256 _spentTokens
    )
        internal
    {
        uint256 currentPeriod = getCurrentPeriod();
        uint256 currentSpentTokens = periodHolderInitialAndSpentBalances[
            currentPeriod
        ][_holder][1];

        periodHolderInitialAndSpentBalances[
            currentPeriod
        ][_holder][1] = currentSpentTokens.add(_spentTokens);
    }

    function setHolderInitialBalance(
        address _holder,
        uint256 _initialBalance
    )
        internal
    {
        uint256 currentPeriod = getCurrentPeriod();

        periodHolderInitialAndSpentBalances[
            currentPeriod
        ][_holder][0] = _initialBalance;
    }

}