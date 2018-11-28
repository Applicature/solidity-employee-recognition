var NYTICSToken = artifacts.require("./NYTICSToken.sol"),
    NYTICSStrategyUS = artifacts.require("./NYTICSPricingStrategy.sol"),
    NYTICSStrategyNonUS = artifacts.require("./NYTICSPricingStrategy.sol"),
    NYTICSNonUSCrowdsale = artifacts.require("./NYTICSCrowdsale.sol"),
    NYTICSUSCrowdsale = artifacts.require("./NYTICSCrowdsale.sol"),
    MintableTokenAllocator = artifacts.require("./allocator/MintableTokenAllocator.sol"),
    CappedDistributedDirectContributionForwarder = artifacts.require("./contribution/CappedDistributedDirectContributionForwarder.sol"),
    NYTICSAgent = artifacts.require("./NYTICSAgent.sol"),
    NYTICSAllocation = artifacts.require("./NYTICSAllocation.sol"),

    Utils = require("./utils"),
    BigNumber = require('bignumber.js'),

    precision = new BigNumber("1000000000000000000"),
    usdPrecision = new BigNumber("100000"),
    icoSince = parseInt(new Date().getTime() / 1000 - 3600),
    icoTill = parseInt(new Date().getTime() / 1000) + 3600,
    signAddress = web3.eth.accounts[0],
    teamAddress = web3.eth.accounts[5],
    treasuryAddress = web3.eth.accounts[7],
    applicatureHolder = web3.eth.accounts[8],
    etherHolder = web3.eth.accounts[9];

var abi = require('ethereumjs-abi'),
    BN = require('bn.js');

async function deploy() {
    const token = await NYTICSToken.new(icoTill);
    const strategyUS = await NYTICSStrategyUS.new([], 0,new BigNumber('1000').mul(usdPrecision), [1529927596, 1529927598, 1529927596, 1529927598, 1529927596, 1529927598, 1529927596, 1529927598]);
    const strategyNonUS = await NYTICSStrategyNonUS.new([], 1, new BigNumber('1000').mul(usdPrecision), [1529927596, 1529927598, 1529927596, 1529927598, 1529927596, 1529927598]);
    const contributionForwarder = await CappedDistributedDirectContributionForwarder.new(
        new BigNumber('100').mul(usdPrecision),
        [applicatureHolder, etherHolder],
        [new BigNumber('1').mul(usdPrecision), new BigNumber('99').mul(usdPrecision)],
        [
            new BigNumber('1000').mul(usdPrecision), new BigNumber('0.75').mul(usdPrecision), new BigNumber('99.25').mul(usdPrecision),
            new BigNumber('1000').mul(usdPrecision), new BigNumber('0.5').mul(usdPrecision), new BigNumber('99.5').mul(usdPrecision),
            new BigNumber('0').mul(usdPrecision), new BigNumber('0'), new BigNumber('0'),
        ]
    );
    const allocator = await MintableTokenAllocator.new(token.address);
    const crowdsaleUS = await NYTICSUSCrowdsale.new(
        allocator.address,
        contributionForwarder.address,
        strategyUS.address,
        icoSince,
        icoTill
    );
    const crowdsaleNonUS = await NYTICSNonUSCrowdsale.new(
        allocator.address,
        contributionForwarder.address,
        strategyNonUS.address,
        icoSince,
        icoTill
    );

    const agent = await NYTICSAgent.new([crowdsaleUS.address, crowdsaleNonUS.address], token.address, strategyUS.address);

    await NYTICSAllocation.new(strategyUS.address, treasuryAddress, teamAddress, applicatureHolder)
        .then(Utils.receiptShouldFailed)
        .catch(Utils.catchReceiptShouldFailed);

    const allocation = await NYTICSAllocation.new(strategyNonUS.address, treasuryAddress, teamAddress, applicatureHolder);

    await token.updateLockupAgent(allocation.address, true);

    return {
        token,
        strategyUS,
        strategyNonUS,
        contributionForwarder,
        allocator,
        crowdsaleUS,
        crowdsaleNonUS,
        agent,
        allocation
    };
}

contract('Allocation', function (accounts) {

    it("check setPricingStrategy | allocateTeamTokens | allocateTreasuryTokens", async function () {
        const {
            token,
            strategyUS,
            strategyNonUS,
            contributionForwarder,
            allocator,
            crowdsaleUS,
            crowdsaleNonUS,
            agent,
            allocation
        } = await deploy();

        await Utils.checkState({allocation, token}, {
            allocation: {
                pricingStrategy: strategyNonUS.address,
                TYPE_TEAM: 0,
                TYPE_TREASURY: 1,
                TYPE_PROVIDERS: 2,
                TYPE_BOUNTY: 3,
                TYPE_PARTNERS: 4,
                tokensSupplyByType: [
                    {[0]: new BigNumber('567500000').mul(precision).valueOf()},
                    {[1]: new BigNumber('227000000').mul(precision).valueOf()},
                    {[2]: new BigNumber('90800000').mul(precision).valueOf()},
                    {[3]: new BigNumber('22700000').mul(precision).valueOf()},
                    {[4]: new BigNumber('34050000').mul(precision).valueOf()},
                    {[5]: new BigNumber('56750000').sub('0').mul(precision).valueOf()},
                ],
                isCompensationTokensAllocated: false,
                isTeamTokensAllocated: false,
                isTreasuryTokensAllocated: false,
            },
        });

        await token.updateMintingAgent(allocator.address, true);
        await allocator.addCrowdsales(allocation.address);

        await allocation.setPricingStrategy(accounts[9])
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);

        await allocation.setPricingStrategy(strategyUS.address)
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);

        await allocation.setPricingStrategy(strategyNonUS.address)
            .then(Utils.receiptShouldSucceed);

        await strategyNonUS.updateDates(0, icoTill + 3600, icoTill + 3600 * 2);
        await strategyNonUS.updateDates(1, icoTill + 3600 * 3, icoTill + 3600 * 4);
        await strategyNonUS.updateDates(2, icoTill + 3600 * 5, icoTill * 6);

        await allocation.allocateTeamTokens(0x0)
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);

        await allocation.allocateTeamTokens(allocator.address)
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);

        await strategyNonUS.updateDates(1, icoSince, icoSince + 1);
        await allocation.allocateTeamTokens(allocator.address)
            .then(Utils.receiptShouldSucceed);
        await allocation.allocateTeamTokens(allocator.address)
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);

        //------------------------------------------
        await allocation.allocateTreasuryTokens(0x0)
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);
        await allocation.allocateTreasuryTokens(allocator.address)
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);
        await strategyNonUS.updateDates(0, icoSince, icoSince + 1);
        await allocation.allocateTreasuryTokens(allocator.address)
            .then(Utils.receiptShouldSucceed);
        await allocation.allocateTreasuryTokens(allocator.address)
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);
        await Utils.checkState({allocation, token}, {
            token: {
                balanceOf: [
                    {[treasuryAddress]: new BigNumber('227000000').mul(precision).valueOf()},
                    {[teamAddress]: new BigNumber('567500000').mul(precision).valueOf()}
                ],
            },
            allocation: {
                pricingStrategy: strategyNonUS.address,
                TYPE_TEAM: 0,
                TYPE_TREASURY: 1,
                TYPE_PROVIDERS: 2,
                TYPE_BOUNTY: 3,
                TYPE_PARTNERS: 4,
                tokensSupplyByType: [
                    {[0]: new BigNumber('567500000').sub('0').mul(precision).valueOf()},
                    {[1]: new BigNumber('227000000').mul(precision).valueOf()},
                    {[2]: new BigNumber('90800000').mul(precision).valueOf()},
                    {[3]: new BigNumber('22700000').mul(precision).valueOf()},
                    {[4]: new BigNumber('34050000').mul(precision).valueOf()},
                    {[5]: new BigNumber('56750000').sub('0').mul(precision).valueOf()},
                ],
                isCompensationTokensAllocated: false,
                isTeamTokensAllocated: true,
                isTreasuryTokensAllocated: true,
            },
        });

    });

    it("check allocations", async function () {
        const {
            token,
            strategyUS,
            strategyNonUS,
            contributionForwarder,
            allocator,
            crowdsaleUS,
            crowdsaleNonUS,
            agent,
            allocation
        } = await deploy();

        await Utils.checkState({allocation, token}, {
            allocation: {
                pricingStrategy: strategyNonUS.address,
                TYPE_TEAM: 0,
                TYPE_TREASURY: 1,
                TYPE_PROVIDERS: 2,
                TYPE_BOUNTY: 3,
                TYPE_PARTNERS: 4,
                tokensSupplyByType: [
                    {[0]: new BigNumber('567500000').mul(precision).valueOf()},
                    {[1]: new BigNumber('227000000').mul(precision).valueOf()},
                    {[2]: new BigNumber('90800000').mul(precision).valueOf()},
                    {[3]: new BigNumber('22700000').mul(precision).valueOf()},
                    {[4]: new BigNumber('34050000').mul(precision).valueOf()},
                    {[5]: new BigNumber('56750000').mul(precision).valueOf()},
                ],
                isCompensationTokensAllocated: false,
                isTeamTokensAllocated: false,
                isTreasuryTokensAllocated: false,
            },
        });

        await token.updateMintingAgent(allocator.address, true);
        await allocator.addCrowdsales(allocation.address);

        await allocation.allocateBountyAndProvidersAndPartnersTokens(
            3,
            [accounts[5], accounts[7]],
            [new BigNumber('28').mul(precision).valueOf(), new BigNumber('28').mul(precision).valueOf()],
            new BigNumber('56').mul(precision).valueOf(),
            allocator.address,
            {from:accounts[1]}
        )
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);

        await allocation.allocateBountyAndProvidersAndPartnersTokens(
            3,
            [accounts[5]],
            [new BigNumber('28').mul(precision).valueOf(), new BigNumber('28').mul(precision).valueOf()],
            new BigNumber('56').mul(precision).valueOf(),
            allocator.address,
            {from:accounts[0]}
        )
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);

        await allocation.allocateBountyAndProvidersAndPartnersTokens(
            3,
            [accounts[5], accounts[7]],
            [new BigNumber('28').mul(precision).valueOf(), new BigNumber('22700000').mul(precision).valueOf()],
            new BigNumber('567500028').mul(precision).valueOf(),
            allocator.address,
            {from:accounts[0]}
        )
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);

        await strategyNonUS.updateDates(0, icoTill + 3600, icoTill + 3600 * 2);
        await strategyNonUS.updateDates(1, icoTill + 3600 * 3, icoTill + 3600 * 4);
        await strategyNonUS.updateDates(2, icoTill + 3600 * 5, icoTill * 6);

        await allocation.allocateBountyAndProvidersAndPartnersTokens(
            3,
            [accounts[5], accounts[7]],
            [new BigNumber('28').mul(precision).valueOf(), new BigNumber('28').mul(precision).valueOf()],
            new BigNumber('56').mul(precision).valueOf(),
            allocator.address,
            {from:accounts[0]}
        )
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);

        await strategyNonUS.updateDates(2, icoSince, icoSince + 1);
        //----------------
        await allocation.allocateBountyAndProvidersAndPartnersTokens(
            3,
            [accounts[5], accounts[7]],
            [new BigNumber('1000').mul(precision).valueOf(), new BigNumber('2000').mul(precision).valueOf()],
            new BigNumber('3000').mul(precision).valueOf(),
            allocator.address,
            {from:accounts[0]}
        )
            .then(Utils.receiptShouldSucceed);

        await allocation.allocateBountyAndProvidersAndPartnersTokens(
            3,
            [accounts[5], 0x0],
            [new BigNumber('28').mul(precision).valueOf(), new BigNumber('28').mul(precision).valueOf()],
            new BigNumber('56').mul(precision).valueOf(),
            allocator.address,
            {from:accounts[0]}
        )
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);

        await allocation.allocateBountyAndProvidersAndPartnersTokens(
            3,
            [accounts[5], accounts[7]],
            [new BigNumber('28').mul(precision).valueOf(), new BigNumber('0').mul(precision).valueOf()],
            new BigNumber('28').mul(precision).valueOf(),
            allocator.address,
            {from:accounts[0]}
        )
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);

        await allocation.allocateBountyAndProvidersAndPartnersTokens(
            3,
            [accounts[5], accounts[7]],
            [new BigNumber('28').mul(precision).valueOf(), new BigNumber('28').mul(precision).valueOf()],
            new BigNumber('128').mul(precision).valueOf(),
            allocator.address,
            {from:accounts[0]}
        )
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);
        //--------------------------------------
        await strategyNonUS.updateDates(0, icoTill + 3600, icoTill + 3600 * 2);
        await strategyNonUS.updateDates(1, icoTill + 3600 * 3, icoTill + 3600 * 4);
        await strategyNonUS.updateDates(2, icoTill + 3600 * 5, icoTill * 6);

        await allocation.allocateCompensationTokens(allocator.address, {from: accounts[1]})
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);

        await allocation.allocateCompensationTokens(allocator.address, {from: applicatureHolder})
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);

        await strategyNonUS.updateDates(2, icoSince, icoSince + 1);

        await allocation.allocateCompensationTokens(0x0, {from: applicatureHolder})
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);

        await allocation.allocateCompensationTokens(allocator.address, {from: applicatureHolder})
            .then(Utils.receiptShouldSucceed);

        await allocation.allocateCompensationTokens(allocator.address, {from: applicatureHolder})
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);

        await Utils.checkState({allocation, token}, {
            token: {
                balanceOf: [
                    {[accounts[5]]: new BigNumber('1000').mul(precision).valueOf()},
                    {[accounts[7]]: new BigNumber('2000').mul(precision).valueOf()}
                ],
            },
            allocation: {
                pricingStrategy: strategyNonUS.address,
                TYPE_TEAM: 0,
                TYPE_TREASURY: 1,
                TYPE_PROVIDERS: 2,
                TYPE_BOUNTY: 3,
                TYPE_PARTNERS: 4,
                tokensSupplyByType: [
                    {[0]: new BigNumber('567500000').sub('0').mul(precision).valueOf()},
                    {[1]: new BigNumber('227000000').mul(precision).valueOf()},
                    {[2]: new BigNumber('90800000').mul(precision).valueOf()},
                    {[3]: new BigNumber('22700000').sub('3000').mul(precision).valueOf()},
                    {[4]: new BigNumber('34050000').mul(precision).valueOf()},
                    {[5]: new BigNumber('56750000').sub('0').mul(precision).valueOf()},
                ],
                isCompensationTokensAllocated: true,
                isTeamTokensAllocated: false,
                isTreasuryTokensAllocated: false,
            },
        });

    });

});