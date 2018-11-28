var
    USDExchange = artifacts.require("./pricing/USDExchange.sol"),
    Utils = require("./utils"),
    BigNumber = require('bignumber.js');

contract('USDExchange', function (accounts) {
    it('create contract, set token price', async function () {
        let token = await USDExchange.new(
            new BigNumber(30800000)// _etherPriceInUSD,
        )
        let result = await token.etherPriceInUSD.call()
        await assert.equal(new BigNumber(result).valueOf(), 30800000, "etherPriceInUSD is not equal")
        await token.setEtherInUSD('307.65000')
        result = await token.etherPriceInUSD.call()
        await assert.equal(new BigNumber(result).valueOf(), 30765000, "etherPriceInUSD is not equal")
        await token.setEtherInUSD('307.85000',{from: accounts[2]})
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed)
        result = await token.etherPriceInUSD.call()
        await assert.equal(new BigNumber(result).valueOf(), 30765000, "etherPriceInUSD is not equal")
        await token.setTrustedAddress(accounts[2],true)
        assert.equal(await token.trustedAddresses(accounts[2]), true, "trustedAddresses is not equal")
        await token.setEtherInUSD('307.75000',{from: accounts[2]})
        result = await token.etherPriceInUSD.call()
        await assert.equal(new BigNumber(result).valueOf(), 30775000, "etherPriceInUSD is not equal")

    });

    it('create contract, shoudn\'t has an ability set token price in wrong format', async function () {

        let token = await USDExchange.new(
            new BigNumber(30800000)// _etherPriceInUSD,
        )
        let result = await token.etherPriceInUSD.call()
        assert.equal(await result.valueOf(), 30800000, "etherPriceInUSD is not equal")
        await token.setEtherInUSD('307.6500')
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed)

    });
});