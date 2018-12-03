pragma solidity ^0.4.24;

import "./Company.sol";
import "./Managed.sol";


contract CompanyFabric is Managed {

    // Array with all companyAddresses, used for enumeration
    Company[] public companies;

    // Mapping from Company address to bool to indicate if company exist
    mapping (address => bool) private companiesList;

    event CompanyCreated(address companyAddress);

    constructor(address _management)
        public
        Managed(_management)
    {}

    function createCompany(
        address _companyOwner,
        address _rewardExchangeAddress,
        uint256 _startAt,
        uint256 _periodDuration,
        uint256 _periodTotalSupply,
        string _name,
        uint8 _decimals
    )
        public
        requirePermission(CAN_CREATE_COMPANY)
    {
        require(
            _companyOwner != address(0),
            ERROR_NOT_AVAILABLE
        );

        Company company = new Company(
            address(management),
            _rewardExchangeAddress,
            _startAt,
            _periodDuration,
            _periodTotalSupply,
            _name,
            _decimals
        );

        company.transferOwnership(_companyOwner);

        companies.push(company);
        companiesList[company] = true;

        emit CompanyCreated(address(company));
    }

    /**
        * @dev Returns whether the specified company exists
        * @param _companyAddress address of the company to query the existence of
        * @return whether the contract exists
    */
    function isCompanyExists(
        address _companyAddress
    )
        public
        view
        returns (bool)
    {
        return companiesList[_companyAddress];
    }

}
