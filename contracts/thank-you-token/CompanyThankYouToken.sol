pragma solidity ^0.4.24;

import "./erc20/openzeppelin/OpenZeppelinERC20.sol";
import "./erc20/MintableToken.sol";


contract CompanyThankYouToken is OpenZeppelinERC20, MintableToken {

    CompanyState public companyState;

    address public rewardExchangeAddress;

    uint256 public startAt;
    uint256 public periodDuration;
    uint256 public totalSupplySyncedAtPeriodIndex;

    event RecognizeSent(
        address indexed whoSent,
        address indexed toWhomSent,
        uint256 tokensAmount
    );

    event RewardExchanged(
        address indexed whoSent,
        uint256 tokensAmount
    );

    constructor(
        address _managementAddress,
        address _rewardExchangeAddress,
        uint256 _startAt,
        uint256 _periodDuration,
        uint256 _periodTokenMaxSupply,
        string _name,
        uint8 _decimals
    )
        public
        OpenZeppelinERC20(0, string(abi.encodePacked(_name, "THX")), _decimals, "THX", false)
        MintableToken(_periodTokenMaxSupply, _managementAddress)
    {
        require(
            _startAt >= block.timestamp &&
            _periodDuration > 0,
            ERROR_WRONG_AMOUNT
        );
        require(
            _rewardExchangeAddress != address(0),
            ERROR_NOT_AVAILABLE
        );

        rewardExchangeAddress = _rewardExchangeAddress;
        startAt = _startAt;
        periodDuration = _periodDuration;
        companyState = CompanyState.BeforeRecognizingPeriod;
    }

    function updateCompanyState() public {
        if (
            companyState == CompanyState.BeforeRecognizingPeriod &&
            startAt <= block.timestamp
        ) {
            companyState = CompanyState.RecognizingPeriodsInProgress;
        }
    }

    function changeRecognizingPeriodState(bool isInProgress)
        public
        requirePermission(CAN_SUSPEND_RESUME_RECOGNIZING)
    {
        if (isInProgress) {
            companyState = CompanyState.RecognizingPeriodsInProgress;
        } else {
            companyState = CompanyState.RecognizingPeriodsSuspended;
        }
    }

    function getCurrentPeriod() public view returns (uint256) {
        return uint256(block.timestamp.sub(startAt).div(periodDuration));
    }

    function totalSupply() public view returns (uint256) {
        return isTotalSupplySynced() ? super.totalSupply() : 0;
    }

    function isTotalSupplySynced() public view returns (bool) {
        return getCurrentPeriod() == totalSupplySyncedAtPeriodIndex;
    }

    function balanceOf(address _owner) public view returns (uint256) {
        return balances[getCurrentPeriod()][_owner];
    }

    function isRecognizingPeriodsInProgress() public view returns (bool) {
        return companyState == CompanyState.RecognizingPeriodsInProgress;
    }

    function transfer(address _to, uint256 _value) public returns (bool) {
        require(_to != address(0));
        require(_value <= balanceOf(msg.sender));

        setBalance(msg.sender, balanceOf(msg.sender).sub(_value));
        setBalance(_to, balanceOf(_to).add(_value));

        emit Transfer(msg.sender, _to, _value);

        if (_to == address(rewardExchangeAddress)) {
            emit RewardExchanged(msg.sender, _value);

            return true;
        }

        emit RecognizeSent(msg.sender, _to, _value);
        return true;
    }

    function transferFrom(
        address _from,
        address _to,
        uint256 _value
    )
        public
        returns (bool)
    {
        require(_to != address(0));

        require(_value <= balanceOf(_from));
        require(_value <= allowed[_from][msg.sender]);

        setBalance(_from, balanceOf(_from).sub(_value));
        setBalance(_to, balanceOf(_to).add(_value));

        allowed[_from][msg.sender] = allowed[_from][msg.sender].sub(_value);

        emit Transfer(_from, _to, _value);

        if (_to == address(rewardExchangeAddress)) {
            emit RewardExchanged(_from, _value);

            return true;
        }

        emit RecognizeSent(_from, _to, _value);
        return true;
    }

    function setTotalSupplySynced() internal {
        totalSupplySyncedAtPeriodIndex = getCurrentPeriod();
        totalSupply_ = 0;
    }

    function setBalance(address _owner, uint256 _value) internal {
        balances[getCurrentPeriod()][_owner] = _value;
    }

}