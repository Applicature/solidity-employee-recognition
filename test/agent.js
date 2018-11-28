const abi = require('ethereumjs-abi')
const BigNumber = require('bignumber.js')

const utils = require('./utils')
const Agent = artifacts.require('agent/Agent')
const CrowdsaleAgent = artifacts.require('test/CrowdsaleAgentTest')
const MintableCrowdsaleOnSuccessAgent = artifacts.require('test/MintableCrowdsaleOnSuccessAgentTest')


const Crowdsale = artifacts.require('crowdsale/CrowdsaleMultyAgentImpl')
const TokenAllocator = artifacts.require('allocator/MintableTokenAllocator')
const ContributionForwarder = artifacts.require('contribution/DistributedDirectContributionForwarder')
const MintableToken = artifacts.require('token/MintableToken')
const PricingStrategy = artifacts.require('test/USDDateTiersPricingStrategyTest')

let precision = new BigNumber("1000000000000000000"),
    usdPrecision = new BigNumber("100000"),
    icoSince = parseInt(new Date().getTime() / 1000 - 3600),
    icoTill = parseInt(new Date().getTime() / 1000) + 3600;
contract('Agent', accounts => {

  let allocator = null
  let contributionForwarder = null
  let pricingStrategy = null
  let crowdsale = null
  let mintableToken = null

  beforeEach(async () => {
    mintableToken = await MintableToken.new(1000, 100, true, { from: accounts[0]})
    allocator = await TokenAllocator.new(accounts[1], {from: accounts[0]})
    contributionForwarder = await ContributionForwarder.new(100, [accounts[1]], [100], { from: accounts[0]})
    pricingStrategy = await PricingStrategy.new( [///privateSale
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
    ], 18, 75045000, { from: accounts[0]})

    crowdsale = await Crowdsale.new(
                      allocator.address,
                      contributionForwarder.address,
                      pricingStrategy.address,
                      1577750400,
                      1577750400,
                      true,
                      true,
                      true, { from: accounts[0]})

  })

  describe('checking initializating of agents', () => {


    it('should return false because Agent has not been initialized', async () => {

        const instance = await Agent.new({ from: accounts[0]})
        const res = await instance.isInitialized.call()
        assert.equal(res, false, "isInitialized doesn't match");
    });


    it('should return false because MintableCrowdsaleOnSuccessAgent has not been initialized', async () => {
        const instance = await MintableCrowdsaleOnSuccessAgent.new([0x0],0x0)
            .then(utils.receiptShouldFailed).catch(utils.catchReceiptShouldFailed)
        // const res = await instance.isInitialized.call()
        // assert.equal(res, false, "isInitialized doesn't match");
    });

    it('should return true because MintableCrowdsaleOnSuccessAgent has been initialized', async () => {

        const mintableToken = await MintableToken.new(10000, 100, true, { from: accounts[0]})

        const instance = await MintableCrowdsaleOnSuccessAgent.new([crowdsale.address], mintableToken.address)
        const res = await instance.isInitialized.call()
        assert.equal(res, true, "isInitialized doesn't match");
    });

  });

  describe('checking initializating of crowdsale agents', () => {
        it('should return true because agent has been initialized', async () => {
            const instance = await CrowdsaleAgent.new([crowdsale.address])
            const res = await instance.isInitialized.call()
            assert.equal(res, true, "isInitialized doesn't match");
        });

        it('should return false because Crowdsale has not been initialized', async () => {
            const instance = await CrowdsaleAgent.new([0x0])
                .then(utils.receiptShouldFailed).catch(utils.catchReceiptShouldFailed)
        //     const res = await instance.isInitialized.call()
        //     assert.equal(res, false, "isInitialized doesn't match");
        });
    });
});