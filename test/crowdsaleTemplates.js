const abi = require('ethereumjs-abi')
const utils = require('./utils')
const BigNumber = require('bignumber.js')

const Crowdsale = artifacts.require('test/CrowdsaleImplTest')
const MintableTokenAllocator = artifacts.require('allocator/MintableTokenAllocator')
const USDDateTiersPricingStrategy = artifacts.require('test/USDDateTiersPricingStrategyTest')
const DistributedDirectContributionForwarder = artifacts.require('contribution/DistributedDirectContributionForwarder')
const MintableCrowdsaleOnSuccessAgent = artifacts.require('./test/MintableCrowdsaleOnSuccessAgentTest.sol')
const MintableToken = artifacts.require('token/erc20/MintableToken')
const OpenZeppelinERC20 = artifacts.require('token/erc20/openzeppelin/OpenZeppelinERC20')


contract('Crowdsale', accounts => {

    const owner = accounts[0];
    const notOwner = accounts[1];
    const externalContributor = accounts[2];
    const contributor = accounts[4];
    const totalSupply = new BigNumber(1000000000000000000).mul(100).valueOf()
    const startDate = 1519862400 // 03/01/2018
    const endDate = 1546214400 // 12/31/2018
    let erc20 = null
    let allocator = null
    let contributionForwarder = null
    let pricingStrategy = null
    let crowdsale = null
    let precision = new BigNumber(1000000000000000000).valueOf(),
        usdPrecision = new BigNumber(100000).valueOf(),
        icoSince = parseInt(new Date().getTime() / 1000 - 3600),
        icoTill = parseInt(new Date().getTime() / 1000) + 3600;

    beforeEach(async() => {
        // create instance and deploy
        erc20 = await MintableToken.new(totalSupply, 0, true, {from: owner})
        allocator = await MintableTokenAllocator.new(erc20.address, {from: owner})
        contributionForwarder = await DistributedDirectContributionForwarder.new(100, [owner], [100]);
        pricingStrategy = await USDDateTiersPricingStrategy.new(
            [///privateSale
                new BigNumber('1').mul(usdPrecision).valueOf(), //     uint256 tokenInUSD;
                0,// uint256 maxTokensCollected;
                50,// uint256 discountPercents;
                0,// uint256 bonusPercents;
                0,// uint256 minInvestInUSD;
                0,// uint256 maxInvestInUSD;
                icoSince,// uint256 startDate;
                icoTill// uint256 endDate;
                ///preSale
            ], 18, 75045000
        )
        crowdsale = await Crowdsale.new(
            allocator.address,
            contributionForwarder.address,
            pricingStrategy.address, startDate, endDate, true, true, true, {from: owner})
        await erc20.updateMintingAgent(allocator.address, true)
    })

    describe('Crowdsale', () => {

        it('should allow to set crowdsale agent', async() => {
            const mintableCA = await MintableCrowdsaleOnSuccessAgent.new([crowdsale.address], erc20.address)
            await crowdsale.setCrowdsaleAgent(mintableCA.address, {from: owner}).then(utils.receiptShouldSucceed)
        })

        it('should not allow to set crowdsale agent', async() => {
            const mintableCA = await MintableCrowdsaleOnSuccessAgent.new([crowdsale.address], erc20.address)
            await crowdsale.setCrowdsaleAgent(mintableCA.address, {from: notOwner}).catch(utils.catchReceiptShouldFailed)
        })

        it('should get current state', async() => {
            // get current state
            // check state dependencies
            await erc20.updateMintingAgent(allocator.address, true)
            const currentState1 = await allocator.isInitialized()
            assert.equal(currentState1, true, "state doesn't match");

            const currentState2 = await contributionForwarder.isInitialized()
            assert.equal(currentState2, true, "state doesn't match");

            const currentState3 = await pricingStrategy.isInitialized()
            assert.equal(currentState3, true, "state doesn't match");


            // check state the crowdsale
            // 3 == InCrowdsale
            const currentState = await crowdsale.getState()
            assert.equal(currentState, 3, "state doesn't match");

            // try to call update state
            await crowdsale.updateState()
            const updatedState = await crowdsale.getState()

            // it shouldn't be changed because nothing changed
            assert.equal(updatedState, 3, "state doesn't match");
        });

        it('should allow to add external contributor crowdsale agent', async() => {
            await crowdsale.addExternalContributor(externalContributor, {from: owner}).then(utils.receiptShouldSucceed)
        });

        it('should not allow to add external contributor crowdsale agent', async() => {
            await crowdsale.addExternalContributor(externalContributor, {from: notOwner}).catch(utils.catchReceiptShouldFailed)
        });

        it('should allow to make external contribution', async() => {
            await crowdsale.addExternalContributor(externalContributor, {from: owner}).then(utils.receiptShouldSucceed)
            await allocator.addCrowdsales(crowdsale.address, {from: owner}).then(utils.receiptShouldSucceed)
            await erc20.updateMintingAgent(allocator.address, true);

            agent = await MintableCrowdsaleOnSuccessAgent.new([crowdsale.address], erc20.address);

            await erc20.updateStateChangeAgent(agent.address, true);

            await crowdsale.setCrowdsaleAgent(agent.address);
            await crowdsale.externalContribution(contributor, new BigNumber('0.000001').mul(precision).valueOf(), {
                from: externalContributor,
                value: web3.toWei('0', 'ether')
            }).then(utils.receiptShouldSucceed)
        });

        it('should not allow to make external contribution', async() => {
            await crowdsale.externalContribution(contributor, 10, {from: externalContributor}).catch(utils.catchReceiptShouldFailed)
        });

        it('should allow to remove external contributor crowdsale agent', async() => {
            await crowdsale.removeExternalContributor(externalContributor, {from: owner}).then(utils.receiptShouldSucceed)
        });

        it('should not allow to remove external contributor crowdsale agent', async() => {
            await crowdsale.removeExternalContributor(externalContributor, {from: notOwner}).catch(utils.catchReceiptShouldFailed)
        });

        it('should allow to add signer', async() => {
            await crowdsale.addSigner(owner, {from: owner}).then(utils.receiptShouldSucceed)
        });

        it('should not allow to add signer', async() => {
            await crowdsale.addSigner(owner, {from: notOwner}).catch(utils.catchReceiptShouldFailed)
        });

        it('should allow to remove signer', async() => {
            await crowdsale.removeSigner(owner, {from: owner}).then(utils.receiptShouldSucceed)
        });

        it('should not allow to remove signer', async() => {
            await crowdsale.removeSigner(owner, {from: notOwner}).catch(utils.catchReceiptShouldFailed)
        });

        it('should allow to make contribution', async() => {
            await crowdsale.addExternalContributor(externalContributor, {from: owner}).then(utils.receiptShouldSucceed)
            await allocator.addCrowdsales(crowdsale.address, {from: owner}).then(utils.receiptShouldSucceed)
            const signer = accounts[4];
            await crowdsale.addSigner(signer, {from: owner}).then(utils.receiptShouldSucceed)

            const contribution = 10
            const hash = abi.soliditySHA3(['address', 'address'], [crowdsale.address, contributor])
            const sig = web3.eth.sign(signer, hash.toString('hex')).slice(2)
            const r = `0x${sig.slice(0, 64)}`
            const s = `0x${sig.slice(64, 128)}`
            const v = web3.toDecimal(sig.slice(128, 130)) + 27
            const transactionData = abi.simpleEncode('contribute(uint8,bytes32,bytes32)', v, r, s)
            await crowdsale.sendTransaction(
                {
                    value: web3.toWei('0.000000000001', 'ether'),
                    from: contributor,
                    data: transactionData.toString('hex')
                }).then(utils.receiptShouldSucceed)
        });

        it('should not allow to make contribution because signed by not a signer', async() => {
            await crowdsale.addExternalContributor(externalContributor, {from: owner}).then(utils.receiptShouldSucceed)
            await allocator.addCrowdsales(crowdsale.address, {from: owner}).then(utils.receiptShouldSucceed)

            // not a signer any more
            const signer = accounts[4];
            await crowdsale.removeSigner(signer, {from: owner}).then(utils.receiptShouldSucceed)

            const contribution = 10
            const hash = abi.soliditySHA3(['address', 'address'], [crowdsale.address, contributor])
            const sig = web3.eth.sign(signer, hash.toString('hex')).slice(2)
            const r = `0x${sig.slice(0, 64)}`
            const s = `0x${sig.slice(64, 128)}`
            const v = web3.toDecimal(sig.slice(128, 130)) + 27
            const transactionData = abi.simpleEncode('contribute(uint8,bytes32,bytes32)', v, r, s)
            await crowdsale.sendTransaction(
                {
                    value: web3.toWei('0.000000000001', 'ether'),
                    from: contributor,
                    data: transactionData.toString('hex')
                }).catch(utils.catchReceiptShouldFailed)
        });

        it('should not allow to make contribution because of broken hash', async() => {
            await crowdsale.addExternalContributor(externalContributor, {from: owner}).then(utils.receiptShouldSucceed)
            await allocator.addCrowdsales(crowdsale.address, {from: owner}).then(utils.receiptShouldSucceed)
            const signer = accounts[4];
            await crowdsale.addSigner(signer, {from: owner}).then(utils.receiptShouldSucceed)

            const contribution = 10
            const hash = abi.soliditySHA3(['address', 'uint256'], [crowdsale.address, 10])
            const sig = web3.eth.sign(signer, hash.toString('hex')).slice(2)
            const r = `0x${sig.slice(0, 64)}`
            const s = `0x${sig.slice(64, 128)}`
            const v = web3.toDecimal(sig.slice(128, 130)) + 27
            const transactionData = abi.simpleEncode('contribute(uint8,bytes32,bytes32)', v, r, s)
            await crowdsale.sendTransaction(
                {
                    value: web3.toWei('0.000000000001', 'ether'),
                    from: contributor,
                    data: transactionData.toString('hex')
                }).catch(utils.catchReceiptShouldFailed)
        });

        it('should transfer all tokens to creator', async() => {
            erc20 = await OpenZeppelinERC20.new(totalSupply, 'Test', 18, 'TTT', true, {from: owner})
            allocator = await MintableTokenAllocator.new(erc20.address, {from: owner})
            contributionForwarder = await DistributedDirectContributionForwarder.new(100, [owner], [100]);
            pricingStrategy = await  USDDateTiersPricingStrategy.new(
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
                    new BigNumber('1').mul(precision).valueOf(), //     uint256 tokenInUSD;
                    500,// uint256 maxTokensCollected;
                    30,// uint256 discountPercents;
                    0,// uint256 bonusPercents;
                    500000000,// uint256 minInvestInUSD;
                    0,// uint256 maxInvestInUSD;
                    icoTill + 3600,// uint256 startDate;
                    icoTill + 3600 * 2,// uint256 endDate;
                    ///ICO Tier1
                    new BigNumber('1').mul(precision).valueOf(), //     uint256 tokenInUSD;
                    0,// uint256 maxTokensCollected;
                    25,// uint256 discountPercents;
                    0,// uint256 bonusPercents;
                    100000000,// uint256 minInvestInUSD;
                    0,// uint256 maxInvestInUSD;
                    icoTill + 3600,// uint256 startDate;
                    icoTill + 3600 * 2,// uint256 endDate;
                    ///ICO Tier2
                    new BigNumber('1').mul(precision).valueOf(), //     uint256 tokenInUSD;
                    0,// uint256 maxTokensCollected;
                    20,// uint256 discountPercents;
                    0,// uint256 bonusPercents;
                    100000000,// uint256 minInvestInUSD;
                    0,// uint256 maxInvestInUSD;
                    icoTill + 3600,// uint256 startDate;
                    icoTill + 3600 * 2,// uint256 endDate;
                    ///ICO Tier3
                    new BigNumber('1').mul(precision).valueOf(), //     uint256 tokenInUSD;
                    0,// uint256 maxTokensCollected;
                    10,// uint256 discountPercents;
                    0,// uint256 bonusPercents;
                    100000000,// uint256 minInvestInUSD;
                    0,// uint256 maxInvestInUSD;
                    icoTill + 3600,// uint256 startDate;
                    icoTill + 3600 * 2,// uint256 endDate;
                    ///ICO Tier4
                    new BigNumber('1').mul(precision).valueOf(), //     uint256 tokenInUSD;
                    0,// uint256 maxTokensCollected;
                    0,// uint256 discountPercents;
                    0,// uint256 bonusPercents;
                    100000000,// uint256 minInvestInUSD;
                    0,// uint256 maxInvestInUSD;
                    icoTill + 3600,// uint256 startDate;
                    icoTill + 3600 * 2// uint256 endDate;
                ], 18, 75045000
            )
            //  "0xbbf289d846208c16edc8474705c748aff07732db", "0x0dcd2f752394c41875e259e00bb44fd505297caf", "0x5e72914535f202659083db3a02c984188fa26e9f", 1519862400, 1546214400, true, true, true
            crowdsale = await Crowdsale.new(
                allocator.address,
                contributionForwarder.address,
                pricingStrategy.address, startDate, endDate, true, true, true, {from: owner})
            await assert.equal(new BigNumber(await erc20.balanceOf.call(accounts[1])).valueOf(), new BigNumber('0').valueOf(), "balanceOf is not equal");
            await assert.equal(new BigNumber(await erc20.balanceOf.call(accounts[0])).valueOf(), new BigNumber(totalSupply).valueOf(), "balanceOf is not equal");
            await assert.equal(new BigNumber(await erc20.balanceOf.call(erc20.address)).valueOf(), new BigNumber('0').valueOf(), "balanceOf is not equal");

        });
    })
    describe('check internalContribution', () => {
        let token, strategy;
        beforeEach(async() => {
            token = await MintableToken.new(new BigNumber('10').mul(precision).valueOf(), 0, true, {from: owner})
            allocator = await MintableTokenAllocator.new(token.address, {from: owner})
            contributionForwarder = await DistributedDirectContributionForwarder.new(100, [owner], [100]);
            strategy = await USDDateTiersPricingStrategy.new([///privateSale
                new BigNumber('1').mul(usdPrecision).valueOf(), //     uint256 tokenInUSD;
                0,// uint256 maxTokensCollected;
                0,// uint256 discountPercents;
                0,// uint256 bonusPercents;
                0,// uint256 minInvestInUSD;
                0,// uint256 maxInvestInUSD;
                icoSince,// uint256 startDate;
                icoTill,// uint256 endDate;
                ///preSale
                new BigNumber('1').mul(usdPrecision).valueOf(), //     uint256 tokenInUSD;
                500,// uint256 maxTokensCollected;
                30,// uint256 discountPercents;
                0,// uint256 bonusPercents;
                50000000,// uint256 minInvestInUSD;
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
            ], 18, 100000000);
            crowdsale = await Crowdsale.new(
                allocator.address,
                contributionForwarder.address,
                strategy.address, startDate, endDate, true, true, true, {from: owner})
            await allocator.addCrowdsales(crowdsale.address);
            await token.updateMintingAgent(allocator.address, true);
            await token.updateMintingAgent(accounts[0], true);

            agent = await MintableCrowdsaleOnSuccessAgent.new([crowdsale.address], token.address);

            await token.updateStateChangeAgent(agent.address, true);

            await crowdsale.setCrowdsaleAgent(agent.address);
            await crowdsale.addSigner(accounts[0]);
            await crowdsale.addExternalContributor(accounts[0]);

            await token.updateMintingAgent(allocator.address, true)
        })

        it('should failed as crowdsale has not been started', async () => {
            await crowdsale.updateStartDate(new BigNumber(icoTill).sub(10))
            let state = await crowdsale.getState.call()
            assert.equal(state.toString(), 2, 'state is not equal')
            await crowdsale.internalContributionTest(accounts[0], new BigNumber('1').mul(precision).valueOf(),{
                value:new BigNumber('1').mul(precision).valueOf()
            })
                .then(utils.receiptShouldFailed).catch(utils.catchReceiptShouldFailed)
        });

        it('should failed as tokens > tokensAvailable', async() => {
            let state = await crowdsale.getState.call()
            await assert.equal(state.valueOf(), 3, 'state is not equal')

            let tokensAvailable =await allocator.tokensAvailable.call();
            let tokens = await strategy.getTokens.call(accounts[0],
                new BigNumber(tokensAvailable).valueOf(), 0, new BigNumber('10000').mul(precision), 0)
            await assert.equal(new BigNumber(tokens[0]).valueOf(), 0, "tokens is not equal")
            await assert.equal(new BigNumber(tokens[1]).valueOf(), 0, "tokensExcludingBonus is not equal")
            await assert.equal(new BigNumber(tokens[2]).valueOf(), 0, "bonus is not equal")

            await crowdsale.internalContributionTest(accounts[1], new BigNumber('10000').mul(precision).valueOf(),{
                value:new BigNumber('1').mul(precision).valueOf()
            })
                .then(utils.receiptShouldFailed).catch(utils.catchReceiptShouldFailed)
        });

        it('should succeed', async () => {
            let prev = await utils.getEtherBalance(accounts[0]);
            let state = await crowdsale.getState.call();
            await assert.equal(state.valueOf(), 3, 'state is not equal');
            let availableTokens = await allocator.tokensAvailable.call();
            await assert.equal(availableTokens.valueOf(), (new BigNumber('10').mul(precision)).valueOf(), 'tokens is not equal');
            await assert.equal(await crowdsale.allocator.call(), allocator.address, 'allocator is not equal');
            await crowdsale.internalContributionTest(accounts[1], new BigNumber('0.0001').mul(precision).valueOf(),{
                value:new BigNumber('1').mul(precision).valueOf()
            })
                .then(utils.receiptShouldSucceed);
            await assert.equal(new BigNumber(await token.balanceOf.call(accounts[1])).valueOf(),
                new BigNumber('0.1').mul(precision).valueOf(), 'balance is not equal');
        });

    });

});


