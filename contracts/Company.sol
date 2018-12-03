pragma solidity ^0.4.24;

import "./Managed.sol";
import "./token/erc20/openzeppelin/OpenZeppelinERC20.sol";
import "./token/erc20/MintableToken.sol";


contract Company is OpenZeppelinERC20, MintableToken {

    CompanyState public companyState;

    address public rewardExchangeAddress;

    uint256 public startAt;
    uint256 public periodDuration;
    uint256 public totalSupplySyncedAtPeriodIndex;

    event RecognizeSent(address indexed whoSent, address indexed toWhomSent, uint256 _tokensAmount);

    event RewardExchanged(address indexed whoSent, uint256 _tokensAmount);
event Debug(string n, uint256 v);
event DebugA(string n, address v);
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
        OpenZeppelinERC20(0, string(abi.encodePacked(_name, "THX")), _decimals, "THX", false)
        MintableToken(_periodTokenSupply, _managementAddress)

        requireContractExistsInRegistry(CONTRACT_COMPANY_FABRIC)
        canCallOnlyRegisteredContract(CONTRACT_COMPANY_FABRIC)
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

    function getCurrentPeriod() public view returns (uint256) {
        return uint256(block.timestamp.sub(startAt).div(periodDuration));
    }

    function getBalancesIndex() public view returns (uint256) {
        return getCurrentPeriod();
    }

    function isTotalSupplySynced() public view returns (bool) {
        return getCurrentPeriod() == totalSupplySyncedAtPeriodIndex;
    }

    function balanceOf(address _owner) public view returns (uint256) {
        return balances[getCurrentPeriod()][_owner];
    }

    function totalSupply() public view returns (uint256) {
        return isTotalSupplySynced() ? super.totalSupply() : 0;
    }

    function verify(
        address _sender,
        uint256 _amount,
        uint256 _dataGenerationTimestamp,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    )
        public
        pure
        returns (address)
    {
        bytes32 hash = keccak256(abi.encodePacked(_sender, _amount, _dataGenerationTimestamp));

        bytes memory prefix = '\x19Ethereum Signed Message:\n32';

        return ecrecover(keccak256(abi.encodePacked(prefix, hash)), _v, _r, _s);
    }

    function updateCompanyState() public {
        if (companyState == CompanyState.BeforeRecognizingPeriod && startAt <= block.timestamp) {
            companyState = CompanyState.RecognizingPeriodsInProgress;
        }
    }

    function isRecognizingPeriodsInProgress() public view returns (bool) {
        return companyState == CompanyState.RecognizingPeriodsInProgress;
    }

    function claimTokens(
        uint256 _amount,
        uint256 _dataGenerationTimestamp,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    )
        public
    {
        address recoveredAddress = verify(msg.sender, _amount, _dataGenerationTimestamp, _v, _r, _s);
        require(hasPermission(recoveredAddress, CAN_SIGN_TRANSACTION), ERROR_ACCESS_DENIED);

        require(
            block.timestamp <= _dataGenerationTimestamp.add(periodDuration),
            ERROR_NOT_AVAILABLE
        );

        updateCompanyState();
        require(isRecognizingPeriodsInProgress(), ERROR_ACCESS_DENIED);

        if (!isTotalSupplySynced()) {
            setTotalSupplySynced();
        }

        //Only one claim per period allowed
        require(balanceOf(msg.sender) == 0);

        mintInternal(msg.sender, _amount);
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

    function transfer(address _to, uint256 _value) public returns (bool) {
        require(_to != address(0));
        uint256 currentPeriod = getCurrentPeriod();
        require(_value <= balances[currentPeriod][msg.sender]);

        balances[currentPeriod][msg.sender] = balances[currentPeriod][msg.sender].sub(_value);
        balances[currentPeriod][_to] = balances[currentPeriod][_to].add(_value);
        emit Transfer(msg.sender, _to, _value);

        if (_to == address(rewardExchangeAddress)) {
            emit RewardExchanged(msg.sender, _value);

            return true;
        }

        emit RecognizeSent(msg.sender, _to, _value);
        return true;
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
        require(_to != address(0));

        uint256 currentPeriod = getCurrentPeriod();
        require(_value <= balances[currentPeriod][_from]);
        require(_value <= allowed[_from][msg.sender]);

        balances[currentPeriod][_from] = balances[currentPeriod][_from].sub(_value);
        balances[currentPeriod][_to] = balances[currentPeriod][_to].add(_value);
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

}
