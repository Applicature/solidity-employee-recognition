var
    NYTICSPricingStrategyUS = artifacts.require("./NYTICSPricingStrategyTest.sol"),
    NYTICSAgent = artifacts.require("./NYTICSAgent.sol"),
    NYTICSToken = artifacts.require("./NYTICSToken.sol"),
    Utils = require("./utils"),
    BigNumber = require('bignumber.js'),
    precision = new BigNumber("1000000000000000000"),
    usdPrecision = new BigNumber("100000"),
    icoSince = parseInt(new Date().getTime() / 1000 - 3600),
    icoTill = parseInt(new Date().getTime() / 1000) + 3600;

contract('NYTICSPricingStrategy', function (accounts) {
    let strategy, agent;

    beforeEach(async function () {
        strategy = await NYTICSPricingStrategyUS.new([], 1, new BigNumber('1000').mul(usdPrecision), [1529927596, 1529927598, 1529927596, 1529927598, 1529927596, 1529927598]);
        await strategy.updateDates(0, icoSince, icoTill);
        await strategy.updateDates(1, icoTill + 3600, icoTill + 3600 * 2);
        await strategy.updateDates(2, icoTill + 3600 * 3, icoTill * 4);
    });

    it('check getTierIndex returns  properly index', async function () {
        let id = await strategy.getTierIndex.call();
        await assert.equal(new BigNumber(id).valueOf(), 0, "getTierIndex is not equal");

        await strategy.updateSoldTokens(0, new BigNumber('185873605.95').sub('1').mul(precision).valueOf());
        id = await strategy.getTierIndex.call();
        await assert.equal(new BigNumber(id).valueOf(), 0, "getTierIndex is not equal");

        await strategy.updateSoldTokens(0, new BigNumber('185873605.95').mul(precision).valueOf());
        id = await strategy.getTierIndex.call();
        await assert.equal(new BigNumber(id).valueOf(), 3, "getTierIndex is not equal");

        await strategy.updateDates(0, icoSince - 28, icoSince);
        await strategy.updateDates(1, icoSince, icoTill);
        await strategy.updateDates(2, icoTill + 3600 * 3, icoTill * 4);

        id = await strategy.getTierIndex.call();
        await assert.equal(new BigNumber(id).valueOf(), 1, "getTierIndex is not equal");

        await strategy.updateSoldTokens(1, new BigNumber('185873605.95').mul(precision).valueOf());

        id = await strategy.getTierIndex.call();
        await assert.equal(new BigNumber(id).valueOf(), 3, "getTierIndex is not equal");
    });

    it('check getActualDates.call()', async function () {
        await strategy.updateDates(1, icoTill + 3600, icoTill + 3600 + 3600);
        let dates = await strategy.getActualDates.call();
        await assert.equal(new BigNumber(dates[0]).valueOf(), icoSince, "strat is not equal");
        await assert.equal(new BigNumber(dates[1]).valueOf(), icoTill, "end is not equal");

        await strategy.updateSoldTokens(0, new BigNumber('185873605.95').mul(precision).valueOf());

        dates = await strategy.getActualDates.call();
        await assert.equal(new BigNumber(dates[0]).valueOf(), icoTill + 3600, "strat is not equal");
        await assert.equal(new BigNumber(dates[1]).valueOf(), icoTill + 3600 + 3600, "end is not equal");

        await strategy.updateDates(0, icoSince - 3600, icoSince - 3600 - 3600);
        await strategy.updateDates(1, icoSince, icoSince + 1);
        await strategy.updateDates(2, icoTill + 3600 * 3, icoTill + 3600 * 4);

        dates = await strategy.getActualDates.call();
        await assert.equal(new BigNumber(dates[0]).valueOf(), icoTill + 3600 * 3, "strat is not equal");
        await assert.equal(new BigNumber(dates[1]).valueOf(), icoTill + 3600 * 4, "end is not equal");
    });

    describe('check getTokens', async function () {

        it('zero weis  should return zero tokens', async function () {
            let tokens = await strategy.getTokens.call(accounts[0], 5000000, 0, 0, 0)
            await assert.equal(new BigNumber(tokens[0]).valueOf(), 0, "tokens is not equal")
            await assert.equal(new BigNumber(tokens[1]).valueOf(), 0, "tokensExcludingBonus is not equal")
            await assert.equal(new BigNumber(tokens[2]).valueOf(), 0, "bonus is not equal")
        });

        it('less than  min purchase', async function () {
            //minInvest 5000$
            let tokens = await strategy.getTokens.call(
                accounts[0],
                new BigNumber('185873605.95').mul(precision),
                0,
                new BigNumber('4.999999999').mul(precision).valueOf(),
                0
            )
            await assert.equal(new BigNumber(tokens[0]).valueOf(), 0, "tokens is not equal");
            await assert.equal(new BigNumber(tokens[1]).valueOf(), 0, "tokensExcludingBonus is not equal");
            await assert.equal(new BigNumber(tokens[2]).valueOf(), 0, "bonus is not equal");

            tokens = await strategy.getTokens.call(
                accounts[0],
                new BigNumber('185873605.95').mul(precision),
                0,
                new BigNumber('5').mul(precision).valueOf(),
                0
            );
            //1eth = 1000$ = minIvest
            //price = 0,005$
            //1000 / 0,00538 = 185873.605947955390334572
            await assert.equal(new BigNumber(tokens[0]).valueOf(), new BigNumber('929368.029739776951672862').mul(precision).valueOf(), "tokens is not equal")
            await assert.equal(new BigNumber(tokens[1]).valueOf(), new BigNumber('929368.029739776951672862').mul(precision).valueOf(), "tokensExcludingBonus is not equal")
            await assert.equal(new BigNumber(tokens[2]).valueOf(), new BigNumber('0').mul(precision).valueOf(), "bonus is not equal")
        });

        it('before sale period ', async function () {
            await strategy.updateDates(0, icoSince - 28, icoSince);
            await strategy.updateDates(1, icoSince - 28, icoSince);
            let tokens = await strategy.getTokens.call(
                accounts[0],
                new BigNumber('185873605.95').mul(precision),
                0,
                new BigNumber('5').mul(precision).valueOf(),
                0
            );
            await assert.equal(new BigNumber(tokens[0]).valueOf(), 0, "tokens is not equal")
            await assert.equal(new BigNumber(tokens[1]).valueOf(), 0, "tokensExcludingBonus is not equal")
            await assert.equal(new BigNumber(tokens[2]).valueOf(), 0, "bonus is not equal")
        });

        it('outdated', async function () {
            await strategy.updateDates(0, icoTill - 28, icoTill);
            await strategy.updateDates(1, icoTill - 28, icoTill);
            let tokens = await strategy.getTokens.call(
                accounts[0],
                new BigNumber('185873605.95').mul(precision),
                0,
                new BigNumber('5').mul(precision).valueOf(),
                0
            );
            await assert.equal(new BigNumber(tokens[0]).valueOf(), 0, "tokens is not equal")
            await assert.equal(new BigNumber(tokens[1]).valueOf(), 0, "tokensExcludingBonus is not equal")
            await assert.equal(new BigNumber(tokens[2]).valueOf(), 0, "bonus is not equal")
        });

        it('tokens less than available', async function () {
            let tokens = await strategy.getTokens.call(
                accounts[0],
                new BigNumber('929368.029739776951672862').mul(precision).valueOf(),
                0,
                new BigNumber('5').mul(precision).valueOf(),
                0
            );
            //1eth = 1000$ = minIvest
            //price = 0,005$
            //1000 / 0,005 = 185873.605947955390334572
            await assert.equal(new BigNumber(tokens[0]).valueOf(), new BigNumber('929368.029739776951672862').mul(precision).valueOf(), "tokens is not equal")
            await assert.equal(new BigNumber(tokens[1]).valueOf(), new BigNumber('929368.029739776951672862').mul(precision).valueOf(), "tokensExcludingBonus is not equal")
            await assert.equal(new BigNumber(tokens[2]).valueOf(), new BigNumber('0').mul(precision).valueOf(), "bonus is not equal")

            tokens = await strategy.getTokens.call(
                accounts[0],
                new BigNumber('929368.029739776951672862').mul(precision).valueOf(),
                0,
                new BigNumber('5.1').mul(precision).valueOf(),
                0
            );
            await assert.equal(new BigNumber(tokens[0]).valueOf(), 0, "tokens is not equal")
            await assert.equal(new BigNumber(tokens[1]).valueOf(), 0, "tokensExcludingBonus is not equal")
            await assert.equal(new BigNumber(tokens[2]).valueOf(), 0, "bonus is not equal")
        });

        it('success for each  tier and check maxTokensCollected', async function () {
            await strategy.updateSoldTokens(0, new BigNumber('185873605.95').sub('929368.029739776951672862').mul(precision).valueOf());
            let tokens = await strategy.getTokens.call(
                accounts[0],
                new BigNumber('100000000000').mul(precision),
                0,
                new BigNumber('5').mul(precision).valueOf(),
                0
            );
            //1eth = 1000$ = minIvest
            //price = 0,005$
            //1000 / 0,005 = 185873.605947955390334572
            await assert.equal(new BigNumber(tokens[0]).valueOf(), new BigNumber('929368.029739776951672862').mul(precision).valueOf(), "tokens is not equal")
            await assert.equal(new BigNumber(tokens[1]).valueOf(), new BigNumber('929368.029739776951672862').mul(precision).valueOf(), "tokensExcludingBonus is not equal")
            await assert.equal(new BigNumber(tokens[2]).valueOf(), new BigNumber('0').mul(precision).valueOf(), "bonus is not equal")

            tokens = await strategy.getTokens.call(
                accounts[0],
                new BigNumber('100000000000').mul(precision),
                0,
                new BigNumber('5.28').mul(precision).valueOf(),
                0
            );
            await assert.equal(new BigNumber(tokens[0]).valueOf(), new BigNumber('0').mul(precision).valueOf(), "tokens is not equal")
            await assert.equal(new BigNumber(tokens[1]).valueOf(), new BigNumber('0').mul(precision).valueOf(), "tokensExcludingBonus is not equal")
            await assert.equal(new BigNumber(tokens[2]).valueOf(), new BigNumber('0').mul(precision).valueOf(), "bonus is not equal")

            await strategy.updateDates(0, icoSince - 28, icoSince);

            tokens = await strategy.getTokens.call(
                accounts[0],
                new BigNumber('100000000000').mul(precision),
                0,
                new BigNumber('5.28').mul(precision).valueOf(),
                0
            );
            await assert.equal(new BigNumber(tokens[0]).valueOf(), new BigNumber('0').mul(precision).valueOf(), "tokens is not equal")
            await assert.equal(new BigNumber(tokens[1]).valueOf(), new BigNumber('0').mul(precision).valueOf(), "tokensExcludingBonus is not equal")
            await assert.equal(new BigNumber(tokens[2]).valueOf(), new BigNumber('0').mul(precision).valueOf(), "bonus is not equal")

            await strategy.updateDates(1, icoSince, icoTill);

            tokens = await strategy.getTokens.call(
                accounts[0],
                new BigNumber('100000000000').mul(precision),
                0,
                new BigNumber('1').mul(precision).valueOf(),
                0
            );
            //1eth = 1000$ = minIvest
            //price = 0,04$(with discount)
            //discount = 35%
            //airdrop bonus = 5%
            //1000 / 0,04304 * 105/100 = 24395.910780669144981412
            //1000 / 0,04304 = 23234.2007434944237918
            //1000 / 0,04304 * 5/100 = 1250
            await assert.equal(new BigNumber(tokens[0]).valueOf(), new BigNumber('24395.910780669144981412').mul(precision).valueOf(), "tokens is not equal")
            await assert.equal(new BigNumber(tokens[1]).valueOf(), new BigNumber('23234.200743494423791821').mul(precision).valueOf(), "tokensExcludingBonus is not equal")
            await assert.equal(new BigNumber(tokens[2]).valueOf(), new BigNumber('1161.710037174721189591').mul(precision).valueOf(), "bonus is not equal")
        });

        it('check airdrop threshhold', async function () {
            await strategy.updateDates(0, icoSince - 28, icoSince);
            await strategy.updateDates(1, icoSince, icoTill);

            await strategy.updateSoldTokens(1, new BigNumber('90800000').sub('1000').mul(precision).valueOf());

            let tokens = await strategy.getTokens.call(
                accounts[0],
                new BigNumber('1000000000000').mul(precision),
                0,
                new BigNumber('1').mul(precision).valueOf(),
                0
            );

            //1eth = 1000$ = minIvest
            //price = 0,04$(with discount)
            //discount = 35%
            //airdrop bonus = 5%
            //1000 / 0,04304 * 105/100 = 24395.910780669144981412
            //1000 / 0,04304 = 23234.2007434944237918
            //1000 / 0,04304 * 5/100 = 1250
            await assert.equal(new BigNumber(tokens[0]).valueOf(), new BigNumber('23284.200743494423791821').mul(precision).valueOf(), "tokens is not equal")
            await assert.equal(new BigNumber(tokens[1]).valueOf(), new BigNumber('23234.200743494423791821').mul(precision).valueOf(), "tokensExcludingBonus is not equal")
            await assert.equal(new BigNumber(tokens[2]).valueOf(), new BigNumber('50').mul(precision).valueOf(), "bonus is not equal")
        });
    });

    describe('check getWeis', async function () {

        it('zero tokens should return zero weis', async function () {
            let tokens = await strategy.getWeis.call(0, 0, 0)
            await assert.equal(new BigNumber(tokens[0]).valueOf(), 0, "totalWeiAmount is not equal")
            await assert.equal(new BigNumber(tokens[1]).valueOf(), 0, "tokensBonus is not equal")
        });

        it('less than  min purchase', async function () {
            let tokens = await strategy.getWeis.call(0, 0, new BigNumber('929368.029739776951672863').mul(precision).valueOf())
            await assert.equal(new BigNumber(tokens[0]).valueOf(), new BigNumber('5').mul(precision).valueOf(), "totalWeiAmount is not equal")
            await assert.equal(new BigNumber(tokens[1]).valueOf(), new BigNumber('0').mul(precision).valueOf(), "tokensBonus is not equal")
            tokens = await strategy.getWeis.call(0, 0, new BigNumber('929368.029739776951672863').sub('1').mul(precision).valueOf())
            await assert.equal(new BigNumber(tokens[0]).valueOf(), new BigNumber('0').mul(precision).valueOf(), "totalWeiAmount is not equal")
            await assert.equal(new BigNumber(tokens[1]).valueOf(), new BigNumber('0').mul(precision).valueOf(), "tokensBonus is not equal")
        });

        it('outdated', async function () {
            await strategy.updateDates(0, icoTill - 28, icoTill);
            await strategy.updateDates(1, icoTill - 28, icoTill);
            await strategy.updateDates(2, icoTill - 28, icoTill);
            let tokens = await strategy.getWeis.call(0, 0, new BigNumber('40000').mul(precision).valueOf())
            await assert.equal(new BigNumber(tokens[0]).valueOf(), new BigNumber('0').mul(precision).valueOf(), "totalWeiAmount is not equal")
            await assert.equal(new BigNumber(tokens[1]).valueOf(), new BigNumber('0').mul(precision).valueOf(), "tokensBonus is not equal")
        });

        it('before sale period', async function () {
            await strategy.updateDates(0, icoSince - 28, icoSince);
            await strategy.updateDates(1, icoSince - 28, icoSince);
            let tokens = await strategy.getWeis.call(0, 0, new BigNumber('40000').mul(precision).valueOf())
            await assert.equal(new BigNumber(tokens[0]).valueOf(), new BigNumber('0').mul(precision).valueOf(), "totalWeiAmount is not equal")
            await assert.equal(new BigNumber(tokens[1]).valueOf(), new BigNumber('0').mul(precision).valueOf(), "tokensBonus is not equal")
        });

        it('tokens less than available | maxTokensCollected', async function () {
            await strategy.updateSoldTokens(0, new BigNumber('185873605.95').sub('929368.029739776951672863').mul(precision).valueOf());
            let tokens = await strategy.getWeis.call(0, 0, new BigNumber('929368.029739776951672863').mul(precision).valueOf())
            await assert.equal(new BigNumber(tokens[0]).valueOf(), new BigNumber('5').mul(precision).valueOf(), "totalWeiAmount is not equal")
            await assert.equal(new BigNumber(tokens[1]).valueOf(), new BigNumber('0').mul(precision).valueOf(), "tokensBonus is not equal")

            tokens = await strategy.getWeis.call(0, 0, new BigNumber('929368.029739776951672864').mul(precision).valueOf())
            await assert.equal(new BigNumber(tokens[0]).valueOf(), new BigNumber('0').mul(precision).valueOf(), "totalWeiAmount is not equal")
            await assert.equal(new BigNumber(tokens[1]).valueOf(), new BigNumber('0').mul(precision).valueOf(), "tokensBonus is not equal")

        });

        it('success for each  tier', async function () {
            let tokens = await strategy.getWeis.call(0, 0, new BigNumber('929368.029739776951672863').mul(precision).valueOf())
            await assert.equal(new BigNumber(tokens[0]).valueOf(), new BigNumber('5').mul(precision).valueOf(), "totalWeiAmount is not equal")
            await assert.equal(new BigNumber(tokens[1]).valueOf(), new BigNumber('0').mul(precision).valueOf(), "tokensBonus is not equal")

            await strategy.updateDates(0, icoSince - 28, icoSince);

            tokens = await strategy.getWeis.call(0, 0, new BigNumber('929368.029739776951672863').mul(precision).valueOf())
            await assert.equal(new BigNumber(tokens[0]).valueOf(), new BigNumber('0').mul(precision).valueOf(), "totalWeiAmount is not equal")
            await assert.equal(new BigNumber(tokens[1]).valueOf(), new BigNumber('0').mul(precision).valueOf(), "tokensBonus is not equal")

            await strategy.updateDates(1, icoSince, icoTill);

            tokens = await strategy.getWeis.call(0, 0, new BigNumber('46468.4014869888475837').mul(precision).valueOf())
            await assert.equal(new BigNumber(tokens[0]).valueOf(), new BigNumber('2').mul(precision).valueOf(), "totalWeiAmount is not equal")
            await assert.equal(new BigNumber(tokens[1]).valueOf(), new BigNumber('2323.420074349442379185').mul(precision).valueOf(), "tokensBonus is not equal")

        });

    });

    describe('check methods', async function () {

        it('increaseTierTokensWithContribution', async function () {
            //checked with contribution
        });

        it('setCrowdsaleAgent', async function () {
            assert.equal(await strategy.agent.call(), 0x0, "agent is not equal");
            await strategy.setCrowdsaleAgent(accounts[8], {from: accounts[3]})
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);

            await strategy.setCrowdsaleAgent(accounts[5], {from: accounts[0]})
                .then(Utils.receiptShouldSucceed)
            assert.equal(await strategy.agent.call(), accounts[5], "agent is not equal");
        });

        it('getArrayOfUSTiers | increaseTierTokensWithContribution', async function () {
            let usTiersData = await strategy.getArrayOfTiers.call();

            assert.equal(usTiersData[0], new BigNumber('0.00538').mul(usdPrecision).valueOf(), "tokenInUSD is not equal");
            assert.equal(usTiersData[1], new BigNumber('185873605.95').mul(precision).valueOf(), "maxTokensCollected is not equal");
            assert.equal(usTiersData[2], new BigNumber('0').mul(precision).valueOf(), "airdropCap is not equal");
            assert.equal(usTiersData[3], new BigNumber('0').mul(precision).valueOf(), "soldTierTokens is not equal");
            assert.equal(usTiersData[4], new BigNumber('0').mul(precision).valueOf(), "bonusTierTokens is not equal");
            assert.equal(usTiersData[5], new BigNumber('0').mul(1).valueOf(), "discountPercents is not equal");
            assert.equal(usTiersData[6], new BigNumber('0').mul(usdPrecision).valueOf(), "bonusPercents is not equal");
            assert.equal(usTiersData[7], new BigNumber('5000').mul(usdPrecision).valueOf(), "minInvestInUSD is not equal");
            assert.equal(usTiersData[8], icoSince, "startDate is not equal");
            assert.equal(usTiersData[9], icoTill, "endDate is not equal");

            await strategy.setCrowdsaleAgent(accounts[5], {from: accounts[0]})
                .then(Utils.receiptShouldSucceed);

            await strategy.increaseTierTokensWithContribution(0, 56, 28, {from: accounts[0]})
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);
            await strategy.increaseTierTokensWithContribution(28, 56, 28, {from: accounts[5]})
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);
            await strategy.increaseTierTokensWithContribution(0, 0, 28, {from: accounts[5]})
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);
            await strategy.increaseTierTokensWithContribution(0, 56, 28, {from: accounts[5]})
                .then(Utils.receiptShouldSucceed);

            usTiersData = await strategy.getArrayOfTiers.call();

            assert.equal(usTiersData[0], new BigNumber('0.00538').mul(usdPrecision).valueOf(), "tokenInUSD is not equal");
            assert.equal(usTiersData[1], new BigNumber('185873605.95').mul(precision).valueOf(), "maxTokensCollected is not equal");
            assert.equal(usTiersData[2], new BigNumber('0').mul(precision).valueOf(), "airdropCap is not equal");
            assert.equal(usTiersData[3], new BigNumber('0').mul(precision).add('56').valueOf(), "soldTierTokens is not equal");
            assert.equal(usTiersData[4], new BigNumber('0').mul(precision).add('28').valueOf(), "bonusTierTokens is not equal");
            assert.equal(usTiersData[5], new BigNumber('0').mul(1).valueOf(), "discountPercents is not equal");
            assert.equal(usTiersData[6], new BigNumber('0').mul(usdPrecision).valueOf(), "bonusPercents is not equal");
            assert.equal(usTiersData[7], new BigNumber('5000').mul(usdPrecision).valueOf(), "minInvestInUSD is not equal");
            assert.equal(usTiersData[8], icoSince, "startDate is not equal");
            assert.equal(usTiersData[9], icoTill, "endDate is not equal");
        });

        it('getArrayOfNonUSTiers | updateTier', async function () {
            strategy = await NYTICSPricingStrategyUS.new([], 0, new BigNumber('1000').mul(usdPrecision), [1529927596, 1529927598, 1529927596, 1529927598, 1529927596, 1529927598, 1529927596, 1529927598]);
            const token = await NYTICSToken.new(icoTill);
            agent = await NYTICSAgent.new([accounts[0], accounts[1]], token.address, strategy.address);
            await strategy.updateDates(3, icoSince, icoTill);

            await token.updateStateChangeAgent(agent.address, true);

            let nonUsTiersData = await strategy.getArrayOfTiers.call();

            assert.equal(nonUsTiersData[30], new BigNumber('0.03497').mul(usdPrecision).valueOf(), "tokenInUSD is not equal");
            assert.equal(nonUsTiersData[31], new BigNumber('142979696.88').mul(precision).valueOf(), "maxTokensCollected is not equal");
            assert.equal(nonUsTiersData[32], new BigNumber('52692375').mul(precision).valueOf(), "airdropCap is not equal");
            assert.equal(nonUsTiersData[33], new BigNumber('0').mul(precision).valueOf(), "soldTierTokens is not equal");
            assert.equal(nonUsTiersData[34], new BigNumber('0').mul(precision).valueOf(), "bonusTierTokens is not equal");
            assert.equal(nonUsTiersData[35], new BigNumber('0').mul(1).valueOf(), "discountPercents is not equal");
            assert.equal(nonUsTiersData[36], new BigNumber('8').mul(1).valueOf(), "bonusPercents is not equal");
            assert.equal(nonUsTiersData[37], new BigNumber('5000').mul(usdPrecision).valueOf(), "minInvestInUSD is not equal");
            assert.equal(nonUsTiersData[38], icoSince, "startDate is not equal");
            assert.equal(nonUsTiersData[39], icoTill, "endDate is not equal");
            assert.equal(await token.time.call(), icoTill, "time is not equal");

            await strategy.setCrowdsaleAgent(agent.address, {from: accounts[0]})
                .then(Utils.receiptShouldSucceed);

            //_tierId _start _end _minInvest _price _discount _airdropCap _bonus updateLockNeeded

            await strategy.updateTier(3, 27, 28, 28, 28, 28, 28, true, {from: accounts[1]})
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);
            await strategy.updateTier(3, 0, 28, 28, 28, 28, 28, true, {from: accounts[0]})
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);
            await strategy.updateTier(3, 27, 28, 28, 0, 28, 28, true, {from: accounts[0]})
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);
            await strategy.updateTier(3, 28, 28, 28, 28, 28, 28, true, {from: accounts[0]})
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);
            await strategy.updateTier(4, 27, 28, 28, 28, 28, 28, true, {from: accounts[0]})
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);
            await strategy.updateTier(3, 27, 28, 28, 28, 28, 28, true, {from: accounts[0]})
                .then(Utils.receiptShouldSucceed);

            nonUsTiersData = await strategy.getArrayOfTiers.call();

            assert.equal(nonUsTiersData[30], new BigNumber('28').mul(1).valueOf(), "tokenInUSD is not equal");
            assert.equal(nonUsTiersData[31], new BigNumber('142979696.88').mul(precision).valueOf(), "maxTokensCollected is not equal");
            assert.equal(nonUsTiersData[32], new BigNumber('28').mul(1).valueOf(), "airdropCap is not equal");
            assert.equal(nonUsTiersData[33], new BigNumber('0').mul(1).valueOf(), "soldTierTokens is not equal");
            assert.equal(nonUsTiersData[34], new BigNumber('0').mul(1).valueOf(), "bonusTierTokens is not equal");
            assert.equal(nonUsTiersData[35], new BigNumber('0').mul(1).valueOf(), "discountPercents is not equal");
            assert.equal(nonUsTiersData[36], new BigNumber('28').mul(1).valueOf(), "bonusPercents is not equal");
            assert.equal(nonUsTiersData[37], new BigNumber('28').mul(1).valueOf(), "minInvestInUSD is not equal");
            assert.equal(nonUsTiersData[38], 27, "startDate is not equal");
            assert.equal(nonUsTiersData[39], 28, "endDate is not equal");
            assert.equal(await token.time.call(), 31536028, "time is not equal");
        });

    });

});