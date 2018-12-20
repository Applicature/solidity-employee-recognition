pragma solidity ^0.4.24;


contract Constants {

    // Permissions bit constants
    uint256 public constant CAN_CREATE_COMPANY = 1;
    uint256 public constant CAN_SUSPEND_RESUME_RECOGNIZING = 2;
    uint256 public constant CAN_SIGN_TRANSACTION = 3;
    uint256 public constant CAN_MINT_TOKENS = 4;
    uint256 public constant CAN_UPDATE_STATE = 5;

    // Contract Registry keys
    uint256 public constant CONTRACT_COMPANY_FABRIC = 1;

    // Company Sates
    enum CompanyState{
        BeforeRecognizingPeriod,
        RecognizingPeriodsInProgress,
        RecognizingPeriodsSuspended
    }

    string public constant ERROR_ACCESS_DENIED = "ERROR_ACCESS_DENIED";
    string public constant ERROR_NO_CONTRACT = "ERROR_NO_CONTRACT";
    string public constant ERROR_NOT_AVAILABLE = "ERROR_NOT_AVAILABLE";
    string public constant ERROR_WRONG_AMOUNT = "ERROR_WRONG_AMOUNT";
}