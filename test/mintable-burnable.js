var
    MintableBurnableToken = artifacts.require('allocator/MintableBurnableToken'),
    USDDateTiersPricingStrategy = artifacts.require("./test/USDDateTiersPricingStrategyTest.sol"),
    Crowdsale = artifacts.require("./crowdsale/CrowdsaleMultyAgentImpl.sol"),
    MintableTokenAllocator = artifacts.require("./allocator/MintableTokenAllocator.sol"),
    DirectContributionForwarder = artifacts.require("./contribution/DistributedDirectContributionForwarder.sol"),
    Agent = artifacts.require("./test/MintableCrowdsaleOnSuccessAgentTest.sol"),
    utils = require("./utils"),
    BigNumber = require('bignumber.js'),
    usdPrecision = new BigNumber("100000"),
    signAddress = web3.eth.accounts[0],
    etherHolder = web3.eth.accounts[9],
    icoSince = parseInt(new Date().getTime() / 1000 - 3600),
    icoTill = parseInt(new Date().getTime() / 1000) + 3600;

contract('MintableBurnableToken', accounts => {

    let
        strategy,
        contributionForwarder,
        allocator,
        crowdsale,
        agent,
        allocation,
        mintableToken;

    beforeEach(async function () {
        mintableToken = await MintableBurnableToken.new(10000e18, 0, true);
        strategy = await USDDateTiersPricingStrategy.new(
            [///privateSale
                new BigNumber('1').mul(usdPrecision).valueOf(), //     uint256 tokenInUSD;
                0,// uint256 maxTokensCollected;
                50,// uint256 discountPercents;
                0,// uint256 bonusPercents;
                5000000000,// uint256 minInvestInUSD;
                0,// uint256 maxInvestInUSD;
                icoSince,// uint256 startDate;
                icoTill,// uint256 endDate;
                ///preSale
                new BigNumber('1').mul(usdPrecision).valueOf(), //     uint256 tokenInUSD;
                500,// uint256 maxTokensCollected;
                30,// uint256 discountPercents;
                0,// uint256 bonusPercents;
                500000000,// uint256 minInvestInUSD;
                0,// uint256 maxInvestInUSD;
                icoTill + 3600,// uint256 startDate;
                icoTill + 3600 * 2,// uint256 endDate;
                ///ICO Tier1
                new BigNumber('1').mul(usdPrecision).valueOf(), //     uint256 tokenInUSD;
                0,// uint256 maxTokensCollected;
                25,// uint256 discountPercents;
                0,// uint256 bonusPercents;
                100000000,// uint256 minInvestInUSD;
                0,// uint256 maxInvestInUSD;
                icoTill + 3600,// uint256 startDate;
                icoTill + 3600 * 2,// uint256 endDate;
                ///ICO Tier2
                new BigNumber('1').mul(usdPrecision).valueOf(), //     uint256 tokenInUSD;
                0,// uint256 maxTokensCollected;
                20,// uint256 discountPercents;
                0,// uint256 bonusPercents;
                100000000,// uint256 minInvestInUSD;
                0,// uint256 maxInvestInUSD;
                icoTill + 3600,// uint256 startDate;
                icoTill + 3600 * 2,// uint256 endDate;
                ///ICO Tier3
                new BigNumber('1').mul(usdPrecision).valueOf(), //     uint256 tokenInUSD;
                0,// uint256 maxTokensCollected;
                10,// uint256 discountPercents;
                0,// uint256 bonusPercents;
                100000000,// uint256 minInvestInUSD;
                0,// uint256 maxInvestInUSD;
                icoTill + 3600,// uint256 startDate;
                icoTill + 3600 * 2,// uint256 endDate;
                ///ICO Tier4
                new BigNumber('1').mul(usdPrecision).valueOf(), //     uint256 tokenInUSD;
                0,// uint256 maxTokensCollected;
                0,// uint256 discountPercents;
                0,// uint256 bonusPercents;
                100000000,// uint256 minInvestInUSD;
                0,// uint256 maxInvestInUSD;
                icoTill + 3600,// uint256 startDate;
                icoTill + 3600 * 2// uint256 endDate;
            ], 18, 75045000
        )

        contributionForwarder = await DirectContributionForwarder.new(100, [etherHolder], [100]);
        allocator = await MintableTokenAllocator.new(mintableToken.address);
        crowdsale = await Crowdsale.new(
            allocator.address,
            contributionForwarder.address,
            strategy.address,
            icoSince,
            new BigNumber(icoSince).add(3600 * 24) * 4,
            true,
            true,
            false
        );

        agent = await Agent.new([crowdsale.address], mintableToken.address);

        await allocator.addCrowdsales(crowdsale.address);

        await mintableToken.updateMintingAgent(allocator.address, true);
        await mintableToken.updateBurnAgent(agent.address, true);
        await mintableToken.updateStateChangeAgent(agent.address, true);

        await crowdsale.setCrowdsaleAgent(agent.address);
        await crowdsale.addSigner(signAddress);
        await crowdsale.addSigner(accounts[0]);
        await crowdsale.addExternalContributor(signAddress);

        await allocator.addCrowdsales(accounts[0]);
    });

    describe('check updateBurnAgent', () => {
        it('should not allow to update burn agent by not owner', async () => {
            await mintableToken.updateBurnAgent(accounts[2], true, {from: accounts[1]})
                .then(utils.receiptShouldFailed).catch(utils.catchReceiptShouldFailed)
            assert.equal(await mintableToken.burnAgents.call(accounts[2]), false, 'burnAgent is not equal')
        });

        it('should allow to update burn agent by owner', async () => {
            await mintableToken.updateBurnAgent(accounts[2], true)
                .then(utils.receiptShouldSucceed)
            assert.equal(await mintableToken.burnAgents.call(accounts[2]), true, 'burnAgent is not equal')
        });
    });

    describe('check burnByAgent', () => {
        it('should not allow to burn by not agent', async () => {
            await mintableToken.updateBurnAgent(accounts[2], true)
                .then(utils.receiptShouldSucceed)
            await mintableToken.burnByAgent(accounts[1], 10e18)
                .then(utils.receiptShouldFailed).catch(utils.catchReceiptShouldFailed)
        });

        it('should allow to burn all balance', async () => {
            await mintableToken.updateBurnAgent(accounts[2], true)
                .then(utils.receiptShouldSucceed)
            await assert.equal(await mintableToken.burnAgents.call(accounts[2]), true, 'burnAgents is not equal')
            await allocator.addCrowdsales(accounts[0]);
            await allocator.allocate(accounts[1], 100e18).then(utils.receiptShouldSucceed)
            let tokenBalance = await mintableToken.balanceOf.call(accounts[1]);
            await assert.equal(await mintableToken.totalSupply.call(), 100e18, 'totalSupply is not equal')
            await assert.equal(tokenBalance.valueOf(), 100e18, 'tokenBalance is not equal')
            await mintableToken.burnByAgent(accounts[1], 0, {from: accounts[2]})
                .then(utils.receiptShouldSucceed)
            tokenBalance = await mintableToken.balanceOf.call(accounts[1]);
            await assert.equal(await tokenBalance.valueOf(), 0, 'tokenBalance is not equal')
        });

        it('should allow to burn', async () => {
            await mintableToken.updateBurnAgent(accounts[2], true)
                .then(utils.receiptShouldSucceed)
            await assert.equal(await mintableToken.burnAgents.call(accounts[2]), true, 'burnAgents is not equal')
            await allocator.addCrowdsales(accounts[0]);
            await allocator.allocate(accounts[1], 100e18).then(utils.receiptShouldSucceed)
            let tokenBalance = await mintableToken.balanceOf.call(accounts[1]);
            await assert.equal(await mintableToken.totalSupply.call(), 100e18, 'totalSupply is not equal')
            await assert.equal(tokenBalance.valueOf(), 100e18, 'tokenBalance is not equal')
            await mintableToken.burnByAgent(accounts[1], 10e18, {from: accounts[2]})
                .then(utils.receiptShouldSucceed)
            tokenBalance = await mintableToken.balanceOf.call(accounts[1]);
            await assert.equal(await tokenBalance.valueOf(), 90e18, 'tokenBalance is not equal')
        });
    });
})