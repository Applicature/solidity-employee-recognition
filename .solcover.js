module.exports = {
    skipFiles: ['Migrations.sol',
        'test/CrowdsaleAgentTest.sol',
        'test/CrowdsaleImplTest.sol',
        'test/LockupContractTest.sol',
        'test/MintableCrowdsaleOnSuccessAgentTest.sol',
        'test/NYTICSPricingStrategyTest.sol',
        'test/TimeLockedTest.sol',
        'test/USDDateTiersPricingStrategy.sol',
        'test/NAAIStrategyTest.sol',
    ],
    // need for dependencies
    copyNodeModules: true,
    copyPackages: ['zeppelin-solidity', 'minimetoken'],
    dir: '.',
    norpc: false
};
