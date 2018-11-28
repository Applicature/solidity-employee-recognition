var
    NYTICSToken = artifacts.require("./NYTICSToken.sol"),
    NYTICSPricingStrategyUS = artifacts.require("./NYTICSPricingStrategy.sol"),
    NYTICSPricingStrategyNonUS = artifacts.require("./NYTICSPricingStrategy.sol"),
    NYTICSNonUSCrowdsale = artifacts.require("./NYTICSCrowdsale.sol"),
    NYTICSUSCrowdsale = artifacts.require("./NYTICSCrowdsale.sol"),
    MintableTokenAllocator = artifacts.require("./allocator/MintableTokenAllocator.sol"),
    CappedDistributedDirectContributionForwarder = artifacts.require("./contribution/CappedDistributedDirectContributionForwarder.sol"),
    NYTICSAgent = artifacts.require("./NYTICSAgent.sol"),

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

async function deploy() {
    const token = await NYTICSToken.new(icoTill);
    const strategyUS = await NYTICSPricingStrategyUS.new([], 0, new BigNumber('1000').mul(usdPrecision), [1529927596, 1529927598, 1529927596, 1529927598, 1529927596, 1529927598, 1529927596, 1529927598]);
    const strategyNonUS = await NYTICSPricingStrategyNonUS.new([], 1, new BigNumber('1000').mul(usdPrecision), [1529927596, 1529927598, 1529927596, 1529927598, 1529927596, 1529927598]);
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

    await allocator.addCrowdsales(crowdsaleUS.address);
    await allocator.addCrowdsales(crowdsaleNonUS.address);
    await token.updateMintingAgent(allocator.address, true);
    await token.updateBurnAgent(agent.address, true);
    // await token.updateStateChangeAgent(agent.address, true);

    await crowdsaleUS.setCrowdsaleAgent(agent.address);
    await crowdsaleNonUS.setCrowdsaleAgent(agent.address);
    await strategyUS.setCrowdsaleAgent(agent.address);
    await strategyNonUS.setCrowdsaleAgent(agent.address);
    // await token.setAgent(agent.address);
    await crowdsaleUS.addSigner(signAddress);
    await crowdsaleNonUS.addSigner(signAddress);
    await crowdsaleUS.addExternalContributor(signAddress);
    await crowdsaleNonUS.addExternalContributor(signAddress);

    return {
        token,
        strategyUS,
        strategyNonUS,
        contributionForwarder,
        allocator,
        crowdsaleUS,
        crowdsaleNonUS,
        agent
    };
}

contract('Token', function (accounts) {

    it("deploy contract & check transfers", async function () {
        const {
            token,
            strategyUS,
            strategyNonUS,
            contributionForwarder,
            allocator,
            crowdsaleUS,
            crowdsaleNonUS,
            agent
        } = await deploy();

        // await token.setCrowdSale(crowdsale.address, {from: accounts[0]})
        //     .then(Utils.receiptShouldSucceed);

        await crowdsaleUS.updateWhitelist(accounts[1], true);

        await strategyUS.updateDates(0, icoSince, icoTill);
        await strategyUS.updateDates(1, icoTill + 3600, icoTill + 3600 + 3600);

        await crowdsaleUS.sendTransaction({value: new BigNumber('5').mul(precision).valueOf(), from: accounts[1]})
            .then(Utils.receiptShouldSucceed);

        await token.transfer(accounts[2], new BigNumber('100').mul(precision).valueOf(), {from: accounts[1]})
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);

        // await crowdsaleUS.updateUsdCollected(new BigNumber('10000001').mul(usdPrecision).valueOf());

        // await token.transfer(accounts[2], new BigNumber('100').mul(precision).valueOf(), {from: accounts[1]})
        //     .then(Utils.receiptShouldFailed)
        //     .catch(Utils.catchReceiptShouldFailed);

        await token.updateStateChangeAgent(accounts[0], true);
        await token.setUnlockTime(icoSince);

        await token.transfer(accounts[2], new BigNumber('100').mul(precision).valueOf(), {from: accounts[1]})
        // .then(Utils.receiptShouldFailed);
            .then(Utils.receiptShouldSucceed);

    });

    it("deploy contract & check transferFrom", async function () {
        const {
            token,
            strategyUS,
            strategyNonUS,
            contributionForwarder,
            allocator,
            crowdsaleUS,
            crowdsaleNonUS,
            agent
        } = await deploy();

        // await token.setCrowdSale(crowdsale.address, {from: accounts[0]})
        //     .then(Utils.receiptShouldSucceed);

        await crowdsaleUS.updateWhitelist(accounts[1], true);

        await strategyUS.updateDates(0, icoSince, icoTill);
        await strategyUS.updateDates(1, icoTill + 1600, icoTill + 2600);

        await crowdsaleUS.sendTransaction({value: new BigNumber('20').mul(precision).valueOf(), from: accounts[1]})
            .then(Utils.receiptShouldSucceed);

        await token.approve(accounts[0], new BigNumber('100').mul(precision).valueOf(), {from:accounts[1]})
        await assert.equal((await token.allowance.call(accounts[1], accounts[0])).valueOf(), 100*precision, 'allowance is not equal')

        await token.updateExcludedAddress(accounts[1], true).then(Utils.receiptShouldSucceed)
        await assert.equal(await token.excludedAddresses.call(accounts[1]), true, 'excludedAddresses value is not equal')

        await assert.equal(await token.isTransferAllowed.call(accounts[1], new BigNumber('10').mul(precision).valueOf()), true, 'value is not equal')

        await token.transferFrom(accounts[1], accounts[2], new BigNumber('10').mul(precision).valueOf(), {from:accounts[0]})
            .then(Utils.receiptShouldSucceed)

        await token.updateExcludedAddress(accounts[1], false).then(Utils.receiptShouldSucceed)
        await assert.equal(await token.excludedAddresses.call(accounts[1]), false, 'excludedAddresses value is not equal')

        await token.transferFrom(accounts[1], accounts[2], new BigNumber('10').mul(precision).valueOf(), {from:accounts[0]})
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);

        // await crowdsaleUS.updateUsdCollected(new BigNumber('10000000').mul(usdPrecision).valueOf());
        //
        // await token.transferFrom(accounts[1], accounts[2], new BigNumber('100').mul(precision).valueOf(), {from:accounts[0]})
        //     .then(Utils.receiptShouldFailed)
        //     .catch(Utils.catchReceiptShouldFailed);

        await token.updateStateChangeAgent(accounts[0], true);
        await token.setUnlockTime(icoSince);

        await token.transferFrom(accounts[1], accounts[2], new BigNumber('10').mul(precision).valueOf(), {from:accounts[0]})
            .then(Utils.receiptShouldSucceed);
    });

});