var NYTICSToken = artifacts.require("./NYTICSToken.sol"),
    NYTICSStrategyUS = artifacts.require("./NYTICSPricingStrategy.sol"),
    NYTICSStrategyNonUS = artifacts.require("./NYTICSPricingStrategy.sol"),
    NYTICSNonUSCrowdsale = artifacts.require("./NYTICSCrowdsale.sol"),
    NYTICSUSCrowdsale = artifacts.require("./NYTICSCrowdsale.sol"),
    MintableTokenAllocator = artifacts.require("./allocator/MintableTokenAllocator.sol"),
    CappedDistributedDirectContributionForwarder = artifacts.require("./contribution/CappedDistributedDirectContributionForwarder.sol"),
    NYTICSAgent = artifacts.require("./NYTICSAgent.sol"),
    NYTICSAllocation = artifacts.require("./NYTICSAllocation.sol"),
    NYTICSStats = artifacts.require("./NYTICSStats.sol"),

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
    const strategyUS = await NYTICSStrategyUS.new([], 0,new BigNumber('1000').mul(usdPrecision),  [1529927596, 1529927598, 1529927596, 1529927598, 1529927596, 1529927598, 1529927596, 1529927598]);
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

    await token.updateLockupAgent(allocation.address, true);
    const stats = await NYTICSStats.new(
        token.address,
        allocator.address,
        crowdsaleNonUS.address,
        crowdsaleUS.address,
        strategyNonUS.address,
        strategyUS.address
    );

    await allocator.addCrowdsales(crowdsaleNonUS.address);
    await allocator.addCrowdsales(crowdsaleUS.address);
    await token.updateMintingAgent(allocator.address, true);

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
        stats
    };
}

contract('StatsContract', function (accounts) {

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
            stats
        } = await deploy();

        await strategyNonUS.updateDates(0, icoSince, icoTill);
        await strategyNonUS.updateDates(1, icoTill + 1600, icoTill + 2600);
        await strategyNonUS.updateDates(2, icoTill + 3600, icoTill + 4600);

        await strategyUS.updateDates(0, icoSince, icoTill);
        await strategyUS.updateDates(1, icoTill + 1600, icoTill + 2600);
        await strategyUS.updateDates(2, icoTill + 3600, icoTill + 4600);
        await strategyUS.updateDates(3, icoTill + 5600, icoTill + 6600);

        //1 = Non US
        let getTokensData = await stats.getTokens.call(1, new BigNumber('5').mul(precision));
        assert.equal(new BigNumber(getTokensData[0]).valueOf(), new BigNumber('929368.029739776951672862').mul(precision).valueOf(), "tokens is not equal");
        assert.equal(new BigNumber(getTokensData[1]).valueOf(), new BigNumber('929368.029739776951672862').mul(precision).valueOf(), "tokensExcludingBonus is not equal");
        assert.equal(new BigNumber(getTokensData[2]).valueOf(), new BigNumber('0').mul(precision).valueOf(), "bonus is not equal");

        getTokensData = await stats.getWeis.call(1, new BigNumber('929368.029739776951672863').mul(precision));
        assert.equal(new BigNumber(getTokensData[0]).valueOf(), new BigNumber('5').mul(precision).valueOf(), "totalWeiAmount is not equal");
        assert.equal(new BigNumber(getTokensData[1]).valueOf(), new BigNumber('0').mul(precision).valueOf(), "tokensBonus is not equal");

        // 0 = US
        getTokensData = await stats.getTokens.call(0, new BigNumber('18.83').mul(precision));
        assert.equal(new BigNumber(getTokensData[0]).valueOf(), new BigNumber('1100000').mul(precision).valueOf(), "tokens is not equal");
        assert.equal(new BigNumber(getTokensData[1]).valueOf(), new BigNumber('1000000').mul(precision).valueOf(), "tokensExcludingBonus is not equal");
        assert.equal(new BigNumber(getTokensData[2]).valueOf(), new BigNumber('100000').mul(precision).valueOf(), "bonus is not equal");

        getTokensData = await stats.getWeis.call(0, new BigNumber('1000000').mul(precision));
        assert.equal(new BigNumber(getTokensData[0]).valueOf(), new BigNumber('18.83').mul(precision).valueOf(), "totalWeiAmount is not equal");
        assert.equal(new BigNumber(getTokensData[1]).valueOf(), new BigNumber('100000').mul(precision).valueOf(), "tokensBonus is not equal");

    });

    it("deploy contract & check getStats", async function () {
        const {
            token,
            strategyUS,
            strategyNonUS,
            contributionForwarder,
            allocator,
            crowdsaleUS,
            crowdsaleNonUS,
            agent,
            stats
        } = await deploy();

        await strategyNonUS.updateDates(0, icoSince, icoTill);
        await strategyNonUS.updateDates(1, icoTill + 1600, icoTill + 2600);
        await strategyNonUS.updateDates(2, icoTill + 3600, icoTill + 4600);

        await strategyUS.updateDates(0, icoSince, icoTill);
        await strategyUS.updateDates(1, icoTill + 1600, icoTill + 2600);
        await strategyUS.updateDates(2, icoTill + 3600, icoTill + 4600);
        await strategyUS.updateDates(3, icoTill + 5600, icoTill + 6600);

        await crowdsaleUS.updateState();
        await crowdsaleNonUS.updateState();

        let statsData = await stats.getStats.call(1, [
            new BigNumber('5').mul(precision),
            new BigNumber('2').mul(precision),
            new BigNumber('3').mul(precision),
            new BigNumber('4').mul(precision),
            new BigNumber('5').mul(precision),
            new BigNumber('6').mul(precision),
            new BigNumber('7').mul(precision)
        ]);

        console.log(statsData[2], 'currencyContr');
        assert.equal(statsData[2][0], new BigNumber('929368.029739776951672862').mul(precision).valueOf(), "tokens is not equal");
        assert.equal(statsData[2][1], new BigNumber('929368.029739776951672862').mul(precision).valueOf(), "tokensExcludingBonus is not equal");
        assert.equal(statsData[2][2], new BigNumber('0').mul(precision).valueOf(), "bonus is not equal");

        console.log(statsData[0], 'stats');
        assert.equal(statsData[0][0], new BigNumber('2317101665.37').mul(precision).valueOf(), "maxTokenSupply is not equal");
        assert.equal(statsData[0][1], new BigNumber('0').mul(precision).valueOf(), "totalTokenSupply is not equal");
        assert.equal(statsData[0][2], new BigNumber('501858736.06').mul(precision).valueOf(), "maxSaleSupply is not equal");
        assert.equal(statsData[0][3], new BigNumber('0').mul(precision).valueOf(), "totalSaleSupply is not equal");
        assert.equal(statsData[0][4], new BigNumber('3').mul(1).valueOf(), "currentStat is not equal");
        assert.equal(statsData[0][5], new BigNumber('0').mul(1).valueOf(), "activeTier is not equal");
        assert.equal(statsData[0][6], new BigNumber('185873605.95').mul(precision).valueOf(), "getTierUnsoldTokens is not equal");
        assert.equal(statsData[0][7], new BigNumber('5').mul(precision).valueOf(), "minEthInvest is not equal");

        console.log(statsData[1], 'tiersData');
        //0.00538
        assert.equal(statsData[1][26], new BigNumber('18.587360594795539033').mul(precision).valueOf(), " tokenInUSD; is not equal");
        assert.equal(statsData[1][27], new BigNumber('0').mul(precision).valueOf(), " tokenInWei; is not equal");
        assert.equal(statsData[1][28], new BigNumber('130111524.16').mul(precision).valueOf(), " maxTokensCollected; is not equal");
        assert.equal(statsData[1][29], new BigNumber('0').mul(precision).valueOf(), " soldTierTokens; is not equal");
        assert.equal(statsData[1][30], new BigNumber('0').mul(precision).valueOf(), " discountPercents; is not equal");
        assert.equal(statsData[1][31], new BigNumber('0').mul(precision).valueOf(), " bonusPercents; is not equal");
        assert.equal(statsData[1][32], new BigNumber('1000').mul(usdPrecision).valueOf(), " minInvestInUSD; is not equal");
        assert.equal(statsData[1][33], new BigNumber('0').mul(precision).valueOf(), " minInvestInWei; is not equal");
        assert.equal(statsData[1][34], new BigNumber('0').mul(precision).valueOf(), " maxInvestInUSD; is not equal");
        assert.equal(statsData[1][35], new BigNumber('0').mul(precision).valueOf(), " maxInvestInWei; is not equal");
        assert.equal(statsData[1][36], icoTill + 3600, " startDate; is not equal");
        assert.equal(statsData[1][37], icoTill + 4600, " endDate; is not equal");
        assert.equal(statsData[1][38], new BigNumber('2').valueOf(), " type is not equal");

        statsData = await stats.getStats.call(0, [
            new BigNumber('1').mul(precision),
            new BigNumber('2').mul(precision),
            new BigNumber('3').mul(precision),
            new BigNumber('4').mul(precision),
            new BigNumber('5').mul(precision),
            new BigNumber('6').mul(precision),
            new BigNumber('7').mul(precision)
        ]);

        assert.equal(statsData[0][0], new BigNumber('2317101665.37').mul(precision).valueOf(), "maxTokenSupply is not equal");
        assert.equal(statsData[0][1], new BigNumber('0').mul(precision).valueOf(), "totalTokenSupply is not equal");
        assert.equal(statsData[0][2], new BigNumber('680242929.31').mul(precision).valueOf(), "maxSaleSupply is not equal");
        assert.equal(statsData[0][3], new BigNumber('0').mul(precision).valueOf(), "totalSaleSupply is not equal");
        assert.equal(statsData[0][4], new BigNumber('3').mul(1).valueOf(), "currentStat is not equal");
        assert.equal(statsData[0][5], new BigNumber('0').mul(1).valueOf(), "activeTier is not equal");
        assert.equal(statsData[0][6], new BigNumber('159320233.67').mul(precision).valueOf(), "getTierUnsoldTokens is not equal");
        assert.equal(statsData[0][7], new BigNumber('5').mul(precision).valueOf(), "minEthInvest is not equal");


    });

});