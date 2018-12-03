pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/BasicToken.sol";
import "openzeppelin-solidity/contracts/ownership/Claimable.sol";
import "../../Managed.sol";


/// @title MintableToken
/// @author Applicature
/// @notice allow to mint tokens
/// @dev Base class
contract MintableToken is BasicToken, Claimable, Managed {
    using SafeMath for uint256;

    uint256 public maxSupply;

    mapping(uint256 => mapping(address => uint256)) balances;

    event Mint(
        address indexed holder, 
        uint256 tokens
    );

    constructor(
        uint256 _maxSupply,
        address _management
    )
        public
        Managed(_management)
    {
        maxSupply = _maxSupply;
    }

    function getBalancesIndex() public view returns (uint256);

    function mint(address _holder, uint256 _tokens)
        public
        requirePermission(CAN_MINT_TOKENS)
    {
        mintInternal(_holder, _tokens);
    }

    /// @return available tokens
    function availableTokens() 
        public 
        view 
        returns (uint256 tokens) 
    {
        return maxSupply.sub(totalSupply());
    }

    function mintInternal(address _holder, uint256 _tokens) internal {
        require(
            totalSupply_.add(_tokens) <= maxSupply,
            ERROR_NOT_AVAILABLE
        );

        totalSupply_ = totalSupply_.add(_tokens);

        balances[getBalancesIndex()][_holder] = balances[getBalancesIndex()][_holder].add(_tokens);

        emit Transfer(address(0), _holder, _tokens);
        emit Mint(_holder, _tokens);
    }

}

