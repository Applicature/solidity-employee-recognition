var NYTICSToken = artifacts.require("./NYTICSToken.sol"),
    NYTICSPricingStrategyUS = artifacts.require("./NYTICSPricingStrategy.sol"),
    NYTICSPricingStrategyNonUS = artifacts.require("./NYTICSPricingStrategy.sol"),
    NYTICSNonUSCrowdsale = artifacts.require("./NYTICSCrowdsale.sol"),
    NYTICSUSCrowdsale = artifacts.require("./NYTICSCrowdsale.sol"),
    MintableTokenAllocator = artifacts.require("./allocator/MintableTokenAllocator.sol"),
    CappedDistributedDirectContributionForwarder = artifacts.require("./contribution/CappedDistributedDirectContributionForwarder.sol"),
    NYTICSAgent = artifacts.require("./NYTICSAgent.sol"),
    AllocationLockupContract = artifacts.require("./AllocationLockupContract.sol"),

    Utils = require("./utils"),
    BigNumber = require('bignumber.js'),

    precision = new BigNumber("1000000000000000000"),
    usdPrecision = new BigNumber("100000"),
    icoSince = parseInt(new Date().getTime() / 1000 - 3600),
    icoTill = parseInt(new Date().getTime() / 1000) + 3600,
    signAddress = web3.eth.accounts[0],
    bountyAddress = web3.eth.accounts[5],
    applicatureHolder = web3.eth.accounts[8],
    etherHolder = web3.eth.accounts[9];

var abi = require('ethereumjs-abi'),
    BN = require('bn.js');

contract('AllocationLockupContract', function (accounts) {
    let token,
        strategy,
        contributionForwarder,
        allocator,
        crowdsale,
        agent,
        allocation;

    beforeEach(async function () {
        token = await NYTICSToken.new(icoTill);
        strategy = await NYTICSPricingStrategyUS.new([], 0, new BigNumber('1000').mul(usdPrecision), [1529927596, 1529927598, 1529927596, 1529927598, 1529927596, 1529927598, 1529927596, 1529927598]);
        
        contributionForwarder = await CappedDistributedDirectContributionForwarder.new(
            new BigNumber('100').mul(usdPrecision),
            [applicatureHolder, etherHolder],
            [new BigNumber('1').mul(usdPrecision), new BigNumber('99').mul(usdPrecision)],
            [
                new BigNumber('1000').mul(usdPrecision), new BigNumber('0.75').mul(usdPrecision), new BigNumber('99.25').mul(usdPrecision),
                new BigNumber('1000').mul(usdPrecision), new BigNumber('0.5').mul(usdPrecision), new BigNumber('99.5').mul(usdPrecision),
                new BigNumber('0').mul(usdPrecision), new BigNumber('0'), new BigNumber('0'),
            ]
        );
        allocator = await MintableTokenAllocator.new(token.address);
        crowdsale = await NYTICSUSCrowdsale.new(
            allocator.address,
            contributionForwarder.address,
            strategy.address,
            icoSince,
            icoTill
        );

        agent = await NYTICSAgent.new([crowdsale.address], token.address, strategy.address);

        allocation = await AllocationLockupContract.new();

        await allocator.addCrowdsales(crowdsale.address);
        await token.updateLockupAgent(agent.address, true);
        await token.updateMintingAgent(allocator.address, true);
        await token.updateBurnAgent(agent.address, true);
        await token.updateStateChangeAgent(agent.address, true);
        // await token.setCrowdSale(crowdsale.address);

        await crowdsale.setCrowdsaleAgent(agent.address);
        await strategy.setCrowdsaleAgent(agent.address);
        await crowdsale.addSigner(signAddress);
        await crowdsale.addExternalContributor(signAddress);

        await allocator.addCrowdsales(allocation.address);
        await token.updateLockupAgent(allocation.address, true)
    });

    describe('check allocationLog', async function () {        
        it ('should not allow to call allocationLog from not lockupAgent', async function () {
            assert.equal(await token.lockupAgents.call(allocation.address), true, 'lockupAgents is not equal')
            await token.allocationLog(accounts[1], 100*precision, icoSince, 3600*24*5, 0, 3600*24)
            .then(Utils.receiptShouldFailed).catch(Utils.catchReceiptShouldFailed)
        });

        it ('should return amount = amount', async function () {
            await token.updateLockupAgent(accounts[0], true)
            await token.allocationLog(accounts[1], 100*precision, icoSince, 3600*24*5, 0, 3600*24)
            .then(Utils.receiptShouldSucceed)
            let amount = await token.lockedAllocationAmount.call(accounts[1], 1)
            assert.equal(amount, 100*precision, 'amount is not equal')
        });

        it ('should return amount = amount - initialUnlock', async function () {
            await token.updateLockupAgent(accounts[0], true)
            await token.allocationLog(accounts[1], 100*precision, icoSince, 3600*24*5, 20, 3600*24)
            .then(Utils.receiptShouldSucceed)
            let amount = await token.lockedAllocationAmount.call(accounts[1], 1)
            assert.equal(amount, 80*precision, 'amount is not equal')
        });
    });

    describe('check isTransferAllowedAllocation', async function () {        
        it ('should allow to transfer as account hasn`t got locked tokens', async function () {
            await allocator.addCrowdsales(accounts[0]);
            await allocator.allocate(accounts[2], 100*precision).then(Utils.receiptShouldSucceed)
            let tokenBalance = await token.balanceOf.call(accounts[2]);
            let result = await allocation.isTransferAllowedAllocation.call(accounts[2], 20*precision, icoSince, tokenBalance)
            assert.equal(result, true, 'isTransferAllowedAllocation is not equal')
        });

        it ('should allow to transfer as transfer amount is less than balance', async function () {
            await token.updateLockupAgent(accounts[0], true)
            await token.allocationLog(accounts[1], 100*precision, icoSince, 3600*24*5, 20, 3600*24)
            .then(Utils.receiptShouldSucceed)
            await assert.equal(new BigNumber(await token.lockedAllocationAmount.call(accounts[1], 1)).valueOf(), 80*precision, 'lockedAllocationAmount is not equal')
            let result = await token.isTransferAllowedAllocation.call(accounts[1], 10*precision, icoSince, 100*precision)
            assert.equal(result, true, 'isTransferAllowedAllocation is not equal')
        });

        it ('should not allow to transfer as all balance is locked', async function () {
            await token.updateLockupAgent(accounts[0], true)
            await token.allocationLog(accounts[1], 100*precision, icoSince, 3600*24*5, 20, 3600*24)
            .then(Utils.receiptShouldSucceed)
            await token.allocationLog(accounts[1], 0, icoSince, 3600*24*5, 20, 3600*24)
            .then(Utils.receiptShouldSucceed)
            let result = await token.isTransferAllowedAllocation.call(accounts[1], 10*precision, icoSince, 100*precision)
            assert.equal(result, false, 'isTransferAllowedAllocation is not equal')
        });

        it ('should not allow to transfer as lockPeriodEnd is less than time and transfer amount is bigger than balance', async function () {
            await token.updateLockupAgent(accounts[0], true)
            await token.allocationLog(accounts[1], 100*precision, icoSince, 3600*24*5, 20, 3600*24)
            .then(Utils.receiptShouldSucceed)
            let result = await token.isTransferAllowedAllocation.call(accounts[1], 100*precision + 10*precision, icoSince + 3600*24*6, 100*precision)
            assert.equal(result, false, 'isTransferAllowedAllocation is not equal')
        });
    });

    describe('check allowedBalance', async function () {        
        it ('should return all balance as account hasn`t got locked tokens', async function () {
            await allocator.addCrowdsales(accounts[0]);
            await allocator.allocate(accounts[2], 100*precision).then(Utils.receiptShouldSucceed)
            let tokenBalance = await token.balanceOf.call(accounts[2])
            let result = await token.allowedBalance.call(accounts[2], icoSince, tokenBalance)
            assert.equal(result.valueOf(), tokenBalance.valueOf(), 'allowedBalance is not equal')
        });

        it ('should return 0 as all balance is locked', async function () {
            await token.updateLockupAgent(accounts[0], true)
            await allocator.addCrowdsales(accounts[0]);
            await allocator.allocate(accounts[2], 100*precision).then(Utils.receiptShouldSucceed)
            let tokenBalance = await token.balanceOf.call(accounts[2]);
            let result = await token.allowedBalance.call(accounts[2], icoSince, tokenBalance)
            assert.equal(result.valueOf(), tokenBalance.valueOf(), 'allowedBalance is not equal')

            await token.allocationLog(accounts[2], 0, icoSince, 3600*24*5, 20, 3600*24)
            .then(Utils.receiptShouldSucceed)
            result = await token.allowedBalance.call(accounts[2], icoSince, tokenBalance)
            assert.equal(result.valueOf(), 0, 'allowedBalance is not equal')
        });

        it ('should return allowedBalance = initialUnlock', async function () {
            await token.updateLockupAgent(accounts[0], true)
            await token.allocationLog(accounts[1], 100*precision, icoSince, 3600*24*5, 20, 0)
            .then(Utils.receiptShouldSucceed)
            let result = await token.allowedBalance.call(accounts[1], icoSince+3600*24, 100*precision)
            assert.equal(result.valueOf(), 20*precision, 'allowedBalance is not equal')
        });

        it ('should return allowedBalance = initialUnlock + releasePeriod tokens', async function () {
            await token.updateLockupAgent(accounts[0], true)
            await token.allocationLog(accounts[1], 100*precision, icoSince, 3600*24*5, 20, 3600*24)
            .then(Utils.receiptShouldSucceed)
            let result = await token.allowedBalance.call(accounts[1], new BigNumber(icoSince).add(3600*25), 100*precision)
            assert.equal(result.valueOf(), 36*precision, 'allowedBalance is not equal')
        });
    });
});