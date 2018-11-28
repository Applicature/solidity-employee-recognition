var NYTICSToken = artifacts.require("./NYTICSToken.sol"),
    NYTICSStrategyUS = artifacts.require("./NYTICSPricingStrategy.sol"),
    NYTICSStrategyNonUS = artifacts.require("./NYTICSPricingStrategy.sol"),
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

contract('NYTICSUSCrowdsale', function (accounts) {

    describe('check contribution flow', async function () {
        let token,
            strategyUS,
            strategyNonUS,
            contributionForwarder,
            allocator,
            crowdsaleUS,
            crowdsaleNonUS,
            agent;

        beforeEach(async function () {
            token = await NYTICSToken.new(icoTill);
            strategyUS = await NYTICSStrategyUS.new([], 0, new BigNumber('1000').mul(usdPrecision), [1529927596, 1529927598, 1529927596, 1529927598, 1529927596, 1529927598, 1529927596, 1529927598]);
            strategyNonUS = await NYTICSStrategyNonUS.new([], 1, new BigNumber('1000').mul(usdPrecision), [1529927596, 1529927598, 1529927596, 1529927598, 1529927596, 1529927598]);
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
            crowdsaleUS = await NYTICSUSCrowdsale.new(
                allocator.address,
                contributionForwarder.address,
                strategyUS.address,
                icoSince,
                icoTill
            );
            crowdsaleNonUS = await NYTICSNonUSCrowdsale.new(
                allocator.address,
                contributionForwarder.address,
                strategyNonUS.address,
                icoSince,
                icoTill
            );
            agent = await NYTICSAgent.new([crowdsaleUS.address, crowdsaleNonUS.address], token.address, strategyUS.address);

            await allocator.addCrowdsales(crowdsaleUS.address);
            await allocator.addCrowdsales(crowdsaleNonUS.address);

            await token.updateMintingAgent(allocator.address, true);
            await token.updateBurnAgent(agent.address, true);
            await token.updateStateChangeAgent(agent.address, true);

            await crowdsaleUS.setCrowdsaleAgent(agent.address);
            await strategyNonUS.setCrowdsaleAgent(agent.address);
            await strategyUS.setCrowdsaleAgent(agent.address);
            await strategyNonUS.setCrowdsaleAgent(agent.address);
        });

        it('check flow | updateState & internalContribution', async function () {
            await Utils.checkState({crowdsaleUS, token}, {
                token: {
                    maxSupply: new BigNumber('2317101665.37').mul(precision).valueOf()
                },
                crowdsaleUS: {
                    crowdsaleTotalTokenSupply: new BigNumber('680242929.31').mul(precision).valueOf(),
                    pricingStrategy: strategyUS.address,
                    currentState: 0,
                    allocator: allocator.address,
                    contributionForwarder: contributionForwarder.address,
                    crowdsaleAgent: agent.address,
                    finalized: false,
                    startDate: icoSince,
                    endDate: icoTill,
                    allowWhitelisted: true,
                    allowSigned: true,
                    allowAnonymous: false,
                    tokensSold: new BigNumber('0').mul(precision).valueOf(),
                    whitelisted: [
                        {[accounts[0]]: false},
                        {[accounts[1]]: false},
                    ],
                    signers: [
                        {[accounts[0]]: false},
                        {[accounts[1]]: false},
                    ],
                    externalContributionAgents: [
                        {[accounts[0]]: false},
                        {[accounts[1]]: false},
                    ],
                    owner: accounts[0],
                    newOwner: 0x0,
                }
            });
            let tierData = await strategyUS.tiers.call(0);
            await assert.equal(tierData[3], 0, "soldTierTokens is not equal");
            await assert.equal(tierData[4], 0, "bonusTierTokens is not equal");

            await crowdsaleUS.updateWhitelist(accounts[1], true);
            await crowdsaleUS.sendTransaction({value: new BigNumber('5').mul(precision).valueOf(), from: accounts[1]})
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);

            await strategyUS.updateDates(0, icoSince, icoTill);
            await strategyUS.updateDates(1, icoTill + 3600, icoTill + 3600 + 3600);

            await crowdsaleUS.sendTransaction({value: new BigNumber('5').mul(precision).valueOf(), from: accounts[1]})
                .then(Utils.receiptShouldSucceed);

            tierData = await strategyUS.tiers.call(0);
            await assert.equal(new BigNumber(tierData[3]).valueOf(), new BigNumber('265533.722782793414763674').mul(precision).mul(1).valueOf(), "soldTierTokens is not equal");
            await assert.equal(new BigNumber(tierData[4]).valueOf(), new BigNumber('26553.372278279341476367').mul(precision).mul(1).valueOf(), "bonusTierTokens is not equal");
            await assert.equal(new BigNumber(await crowdsaleUS.tokensSold.call()).valueOf(), new BigNumber('265533.722782793414763674').mul(1).mul(precision).valueOf(), "tokensSold is not equal");

            await strategyUS.updateDates(0, icoSince, icoSince + 1);
            await strategyUS.updateDates(1, icoSince + 2, icoSince + 3);
            await strategyUS.updateDates(2, icoSince + 2, icoSince + 3);
            await strategyUS.updateDates(3, icoSince + 2, icoSince + 3);

            await crowdsaleUS.updateState()
                .then(Utils.receiptShouldSucceed);

            await Utils.checkState({crowdsaleUS, token}, {
                token: {
                    maxSupply: new BigNumber('2317101665.37').sub(
                        new BigNumber('680242929.31').sub(new BigNumber('265533.722782793414763674')).add(
                            new BigNumber('18160000').sub(new BigNumber('26553.372278279341476367'))
                        )
                    ).mul(precision).valueOf()
                },
                crowdsaleUS: {
                    crowdsaleTotalTokenSupply: new BigNumber('680242929.31').mul(precision).valueOf(),
                    pricingStrategy: strategyUS.address,
                    currentState: 4,
                    allocator: allocator.address,
                    contributionForwarder: contributionForwarder.address,
                    crowdsaleAgent: agent.address,
                    finalized: false,
                    // startDate: icoSince,
                    // endDate: icoTill,
                    allowWhitelisted: true,
                    allowSigned: true,
                    allowAnonymous: false,
                    tokensSold: new BigNumber('265533.722782793414763674').mul(1).mul(precision).valueOf(),
                    whitelisted: [
                        {[accounts[0]]: false},
                        {[accounts[1]]: true},
                    ],
                    signers: [
                        {[accounts[0]]: false},
                        {[accounts[1]]: false},
                    ],
                    externalContributionAgents: [
                        {[accounts[0]]: false},
                        {[accounts[1]]: false},
                    ],
                    owner: accounts[0],
                    newOwner: 0x0,
                }
            });
        });

        it('check agent setNonUsPricingStrategy', async function () {
            await agent.setNonUsPricingStrategy(strategyNonUS.address, {from: accounts[1]})
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);
            await agent.setNonUsPricingStrategy(accounts[3], {from: accounts[0]})
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);
            await agent.setNonUsPricingStrategy(strategyNonUS.address, {from: accounts[0]})
                .then(Utils.receiptShouldSucceed);
        });

    })

});