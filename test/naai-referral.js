var NYTICSToken = artifacts.require("./NYTICSToken.sol"),
    NYTICSStrategyUS = artifacts.require("./NYTICSPricingStrategy.sol"),
    NYTICSStrategyNonUS = artifacts.require("./NYTICSPricingStrategy.sol"),
    NYTICSNonUSCrowdsale = artifacts.require("./NYTICSCrowdsale.sol"),
    NYTICSUSCrowdsale = artifacts.require("./NYTICSCrowdsale.sol"),
    MintableTokenAllocator = artifacts.require("./allocator/MintableTokenAllocator.sol"),
    CappedDistributedDirectContributionForwarder = artifacts.require("./contribution/CappedDistributedDirectContributionForwarder.sol"),
    NYTICSAgent = artifacts.require("./NYTICSAgent.sol"),
    NYTICSAllocation = artifacts.require("./NYTICSAllocation.sol"),

    NYTICReferral = artifacts.require("./NYTICSReferral.sol"),

    Utils = require("./utils"),
    BigNumber = require('bignumber.js'),

    precision = new BigNumber("1000000000000000000"),
    usdPrecision = new BigNumber("100000"),
    icoSince = parseInt(new Date().getTime() / 1000 - 3600),
    icoTill = parseInt(new Date().getTime() / 1000) + 3600,
    yearAgo = 1524574180,
    threeWeeks = 1814400,
    signAddress = web3.eth.accounts[0],
    bountyAddress = web3.eth.accounts[5],
    foundersAddress = web3.eth.accounts[4],
    treasuryAddress = web3.eth.accounts[7],
    compensationAddress = web3.eth.accounts[6],
    etherHolder = web3.eth.accounts[9],
    applicatureHolder = web3.eth.accounts[8];

var abi = require('ethereumjs-abi'),
    BN = require('bn.js');

async function deploy() {
    const token = await NYTICSToken.new(icoTill);
    const strategyUS = await NYTICSStrategyUS.new([], 0, new BigNumber('1000').mul(usdPrecision), [1529927596, 1529927598, 1529927596, 1529927598, 1529927596, 1529927598, 1529927596, 1529927598]);
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
    await NYTICSAllocation.new(strategyUS.address, web3.eth.accounts[3], web3.eth.accounts[4], web3.eth.accounts[4])
        .then(Utils.receiptShouldFailed)
        .catch(Utils.catchReceiptShouldFailed);
    const allocation = await NYTICSAllocation.new(strategyNonUS.address, web3.eth.accounts[3], web3.eth.accounts[4], web3.eth.accounts[4]);

    await allocator.addCrowdsales(crowdsaleNonUS.address);
    await token.updateMintingAgent(allocator.address, true);
    await token.updateBurnAgent(agent.address, true);
    await token.updateStateChangeAgent(agent.address, true);

    await crowdsaleNonUS.setCrowdsaleAgent(agent.address);
    await strategyNonUS.setCrowdsaleAgent(agent.address);
    await crowdsaleNonUS.addSigner(signAddress);
    await crowdsaleNonUS.addExternalContributor(signAddress);

    await NYTICReferral.new(allocator.address, crowdsaleNonUS.address, strategyUS.address)
        .then(Utils.receiptShouldFailed)
        .catch(Utils.catchReceiptShouldFailed);
    const referral = await NYTICReferral.new(allocator.address, crowdsaleNonUS.address, strategyNonUS.address);

    await token.updateMintingAgent(referral.address, true);
    await allocator.addCrowdsales(referral.address);
    await allocator.addCrowdsales(allocation.address);
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
        allocation,
        referral
    };
}

async function makeTransaction(instance, sign, address, amount) {
    'use strict';
    var h = abi.soliditySHA3(['address', 'uint256'], [new BN(address.substr(2), 16), amount]),
        sig = web3.eth.sign(sign, h.toString('hex')).slice(2),
        r = `0x${sig.slice(0, 64)}`,
        s = `0x${sig.slice(64, 128)}`,
        v = web3.toDecimal(sig.slice(128, 130)) + 27;

    var data = abi.simpleEncode('multivestMint(address,uint256,uint8,bytes32,bytes32)', address, amount, v, r, s);

    return instance.sendTransaction({from: address, data: data.toString('hex')});
}


contract('LXReferral', function (accounts) {

    it("check setPricingStrategy", async function () {
        const {
            token,
            strategyUS,
            strategyNonUS,
            contributionForwarder,
            allocator,
            crowdsaleUS,
            crowdsaleNonUS,
            agent,
            allocation,
            referral
        } = await deploy();

        await referral.setPricingStrategy(strategyNonUS.address,{from:accounts[2]})
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);
        await referral.setPricingStrategy(0x0,{from:accounts[2]})
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);

        await referral.setPricingStrategy(strategyNonUS.address,{from:accounts[0]})
            .then(Utils.receiptShouldSucceed);

    })

    it("deploy contract & check getTokens | getWeis", async function () {
        const {
            token,
            strategyUS,
            strategyNonUS,
            contributionForwarder,
            allocator,
            crowdsaleUS,
            crowdsaleNonUS,
            agent,
            allocation,
            referral
        } = await deploy();

        await strategyNonUS.updateDates(0, icoTill + 3600, icoTill + 3600 * 2);
        await strategyNonUS.updateDates(1, icoTill + 3600 * 3, icoTill + 3600 * 4);
        await strategyNonUS.updateDates(2, icoTill + 3600 * 5, icoTill * 6);

        await makeTransaction(referral, signAddress, accounts[1], new BigNumber('1000').valueOf())
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);

        await strategyNonUS.updateDates(2, icoSince, icoSince + 1);

        await makeTransaction(referral, signAddress, accounts[1], new BigNumber('1000').valueOf())
            .then(Utils.receiptShouldSucceed);

        Utils.balanceShouldEqualTo(token.address, accounts[1],new BigNumber('1000').mul(precision).valueOf())
    });

});