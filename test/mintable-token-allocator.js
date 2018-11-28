const abi = require('ethereumjs-abi')
const utils = require('./utils')
const MintableTokenAllocator = artifacts.require('allocator/MintableTokenAllocator')
const MintableToken = artifacts.require('token/MintableToken')

contract('MintableTokenAllocator', accounts => {

  describe('Base methods on the example of one of the heirs', () => {

    it('should allow to add crowdsale', async () => {
        const token = await MintableToken.new(1000, 100, true)
        const crowdsale = accounts[2]
        const allocator = await MintableTokenAllocator.new(token.address)
        await allocator.addCrowdsales(crowdsale).then(utils.receiptShouldSucceed)
    });

    it('should not allow to add crowdsale', async () => {
        const notOwner = accounts[3]
        const token = await MintableToken.new(1000, 100, true)
        const crowdsale = accounts[2]
        const allocator = await MintableTokenAllocator.new(token.address)
        await allocator.addCrowdsales(crowdsale, { from: notOwner})
        .then(utils.receiptShouldFailed)
        .catch(utils.catchReceiptShouldFailed);
    });

    it('should allow to remove crowdsale', async () => {
        const owner = accounts[0]
        const token = await MintableToken.new(1000, 100, true)
        const crowdsale = accounts[2]
        const allocator = await MintableTokenAllocator.new(token.address)
        await allocator.removeCrowdsales(crowdsale, { from: owner})
        .then(utils.receiptShouldSucceed)
    });

    it('should not allow to remove crowdsale', async () => {
        const notOwner = accounts[3]
        const token = await MintableToken.new(1000, 100, true)
        const crowdsale = accounts[2]
        const allocator = await MintableTokenAllocator.new(token.address)
        await allocator.removeCrowdsales(crowdsale, { from: notOwner})
        .then(utils.receiptShouldFailed)
        .catch(utils.catchReceiptShouldFailed);
    });

  });

  describe('MintableTokenAllocator', () => {

    it('tokens available should return 900', async () => {
        const mintableToken = await MintableToken.new(1000, 100, true)
        const allocator = await MintableTokenAllocator.new(mintableToken.address)
        const res = await allocator.tokensAvailable.call()
        assert.equal(res.valueOf(), 900, "tokens doesn't match");
    });

    it('tokens available should return 0', async () => {
        const mintableToken = await MintableToken.new(100, 100, true)
        const allocator = await MintableTokenAllocator.new(mintableToken.address)
        const res = await allocator.tokensAvailable.call()
        assert.equal(res, 0, "tokens doesn't match");
    });

    it('should allow to allocate', async () => {
        const owner = accounts[0]
        const holder = accounts[1]
        const crowdsale = accounts[2]

        const mintableToken = await MintableToken.new(1000000, 100, true)
        const allocator = await MintableTokenAllocator.new(mintableToken.address)
        await allocator.addCrowdsales(crowdsale, { from: owner}).then(utils.receiptShouldSucceed)
        await mintableToken.updateMintingAgent(allocator.address, true)
        await allocator.allocate(holder, 100, { from: crowdsale}).then(utils.receiptShouldSucceed)
    });

    it('should not allow to allocate from not crowdsale', async () => {
        const owner = accounts[0]
        const holder = accounts[1]
        const crowdsale = accounts[2]

        const mintableToken = await MintableToken.new(1000000, 100, true)
        const allocator = await MintableTokenAllocator.new(mintableToken.address)
        await mintableToken.updateMintingAgent(crowdsale, true)
        await allocator.addCrowdsales(crowdsale, { from: owner}).then(utils.receiptShouldSucceed)
        await allocator.allocate(holder, 100, { from: owner})
            .then(utils.receiptShouldFailed)
            .catch(utils.catchReceiptShouldFailed)
    });

    it('should allow to set token from owner', async () => {
        const token = await MintableToken.new(1000, 100, true)
        const allocator = await MintableTokenAllocator.new(token.address)
        await assert.equal(await allocator.token.call(), token.address, 'token is not equal')
        await allocator.setToken(accounts[0])
        assert.equal(await allocator.token.call(), accounts[0], 'token is not equal')
    });

    it('should not allow to set token from not crowdsale', async () => {
        const token = await MintableToken.new(1000, 100, true)
        const allocator = await MintableTokenAllocator.new(token.address)
        await assert.equal(await allocator.token.call(), token.address, 'token is not equal')
        await allocator.setToken(accounts[0], {from:accounts[1]})
        .then(utils.receiptShouldFailed)
        .catch(utils.catchReceiptShouldFailed)
        assert.equal(await allocator.token.call(), token.address, 'token is not equal')
    });
  });

  describe('MintableToken', () => {
    it('should not allow to allocate because totalSupply == maxSupply', async () => {
        const holder = accounts[1]
        const crowdsale = accounts[2]

        const mintableToken = await MintableToken.new(1000000, 900000, true)
        const allocator = await MintableTokenAllocator.new(mintableToken.address)
        await allocator.addCrowdsales(crowdsale).then(utils.receiptShouldSucceed)
        await mintableToken.updateMintingAgent(allocator.address, true)
        await allocator.allocate(holder, 100000, { from: crowdsale}).then(utils.receiptShouldSucceed)
        await allocator.allocate(holder, 100000, { from: crowdsale}).then(utils.receiptShouldFailed).catch(utils.catchReceiptShouldFailed)
    });

    it('should not allow to disable minting from not stateChangeAgents', async () => {
        const holder = accounts[1]
        const crowdsale = accounts[2]

        const mintableToken = await MintableToken.new(1000000, 900000, true)
        const allocator = await MintableTokenAllocator.new(mintableToken.address)
        await allocator.addCrowdsales(crowdsale).then(utils.receiptShouldSucceed)
        await mintableToken.updateMintingAgent(allocator.address, true).then(utils.receiptShouldSucceed)
        await mintableToken.disableMinting().then(utils.receiptShouldFailed).catch(utils.catchReceiptShouldFailed)
        await allocator.allocate(holder, 100000, { from: crowdsale}).then(utils.receiptShouldSucceed)
    });

    it('should allow to disable minting', async () => {
        const owner = accounts[0]
        const holder = accounts[1]
        const crowdsale = accounts[2]

        const mintableToken = await MintableToken.new(1000000, 900000, true)
        const allocator = await MintableTokenAllocator.new(mintableToken.address)
        await allocator.addCrowdsales(crowdsale).then(utils.receiptShouldSucceed)
        await mintableToken.updateMintingAgent(allocator.address, true).then(utils.receiptShouldSucceed)
        await mintableToken.updateStateChangeAgent(owner, true).then(utils.receiptShouldSucceed)
        await mintableToken.disableMinting().then(utils.receiptShouldSucceed)
        await allocator.allocate(holder, 100000, { from: crowdsale}).then(utils.receiptShouldFailed).catch(utils.catchReceiptShouldFailed)
    });
  });
});