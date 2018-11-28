var LockupContract = artifacts.require("./test/LockupContractTest.sol"),
    Utils = require("./utils"),
    BigNumber = require('bignumber.js');

contract('LockupContract', function (accounts) {

    it('log functions updates values in lockedAmount', async function () {
        let token = await LockupContract.new(
            3600,// _lockPeriod,
            10,// _initialUnlock,
            500, // _releasePeriod
        )
        await token.updateLockupAgent(accounts[0], true)
        .then(Utils.receiptShouldSucceed)
        let starting = parseInt(new Date().getTime() / 1000)
        await token.log(accounts[2], 1000, starting)
            .then(Utils.receiptShouldSucceed)
        let result = await token.lockedAmount.call(accounts[2],0)
        await assert.equal(new BigNumber(result).valueOf(), starting, "startingAt is not equal")
        result = await token.lockedAmount.call(accounts[2],1)
        await assert.equal(new BigNumber(result).valueOf(), 900, "lockedBalance is not equal")
    });
    it('only agent can run log function', async function () {
        let token = await LockupContract.new(
            3600,// _lockPeriod,
            0,// _initialUnlock,
            0, // _releasePeriod
        )
        let result = await token.lockupAgents.call(accounts[0])
        await assert.equal(result.valueOf(), false, "lockupAgents is not equal")
         result = await token.lockupAgents.call(accounts[1])
        await assert.equal(result.valueOf(), false, "lockupAgents is not equal")
        await token.updateLockupAgent(accounts[0], true)
            .then(Utils.receiptShouldSucceed)
        await token.updateLockupAgent(accounts[1], true, {from: accounts[3]})
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed)
         result = await token.lockupAgents.call(accounts[0])
        await assert.equal(result.valueOf(), true, "lockupAgents is not equal")
         result = await token.lockupAgents.call(accounts[1])
        await assert.equal(result.valueOf(), false, "lockupAgents is not equal")

    });
    it('zero initial unlock', async function () {
        let token = await LockupContract.new(
            3600,// _lockPeriod,
            0,// _initialUnlock,
            100, // _releasePeriod
        )
        await token.updateLockupAgent(accounts[0], true)
            .then(Utils.receiptShouldSucceed)

        let starting = parseInt(new Date().getTime() / 1000-100)
        await token.log(accounts[2], 1000, starting)
            .then(Utils.receiptShouldSucceed)
        let result = await token.lockedAmount.call(accounts[2],0)
        await assert.equal(new BigNumber(result).valueOf(), starting, "startingAt is not equal")
        result = await token.lockedAmount.call(accounts[2],1)
        await assert.equal(new BigNumber(result).valueOf(), 1000, "lockedBalance is not equal")
        result = await token.allowedBalance.call(
            accounts[2],
            starting+100,
            1000
            )
        console.log(result);
      //  1000*1*100/3600
        result = await token.isTransferAllowedTest.call(
            accounts[2],
            27,
            starting+100,
            1000
        )
        await assert.equal((result).valueOf(), true, "isTransferAllowed is not equal")
        result = await token.isTransferAllowedTest.call(
            accounts[2],
            28,
            starting,
            1000
        )
        await assert.equal((result).valueOf(), false, "isTransferAllowed is not equal")
    });
    it('zero releasePeriod', async function () {
        let token = await LockupContract.new(
            3600,// _lockPeriod,
            2,// _initialUnlock,
            0, // _releasePeriod
        )
        await token.updateLockupAgent(accounts[0], true)
            .then(Utils.receiptShouldSucceed)

        let starting = parseInt(new Date().getTime() / 1000)
        await token.log(accounts[2], 1000, starting)
            .then(Utils.receiptShouldSucceed)
        let result = await token.lockedAmount.call(accounts[2],0)
        await assert.equal(new BigNumber(result).valueOf(), starting, "startingAt is not equal")
        result = await token.lockedAmount.call(accounts[2],1)
        await assert.equal(new BigNumber(result).valueOf(), 980, "lockedBalance is not equal")
    });
    it('only owner can add new agents', async function () {
        let token = await LockupContract.new(
            3600,// _lockPeriod,
            0,// _initialUnlock,
            100, // _releasePeriod
        )
        await token.updateLockupAgent(accounts[0], true)
            .then(Utils.receiptShouldSucceed)
        await token.updateLockupAgent(accounts[0], true,{from:accounts[1]})
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed)

    });
    describe('isTransferAllowed', async function () {
        it('inital unlock is working properly', async function () {
            let token = await LockupContract.new(
                3600,// _lockPeriod,
                2,// _initialUnlock,
                0, // _releasePeriod
            )
            await token.updateLockupAgent(accounts[0], true)
                .then(Utils.receiptShouldSucceed)

            let starting = parseInt(new Date().getTime() / 1000)
            await token.log(accounts[2], 1000, starting)
                .then(Utils.receiptShouldSucceed)
            let result = await token.lockedAmount.call(accounts[2],0)
            await assert.equal(new BigNumber(result).valueOf(), starting, "startingAt is not equal")
            result = await token.lockedAmount.call(accounts[2],1)
            await assert.equal(new BigNumber(result).valueOf(), 980, "lockedBalance is not equal")

            await token.log(accounts[2], 100, starting+500)
                .then(Utils.receiptShouldSucceed)
            result = await token.allowedBalance.call(
                accounts[2],
                starting+500,
                1100
            )
            await assert.equal(new BigNumber(result).valueOf(), 22, "lockedBalance is not equal")
        });
        it('all tokens are unlocked after lock period', async function () {
            let token = await LockupContract.new(
                3600,// _lockPeriod,
                2,// _initialUnlock,
                0, // _releasePeriod
            )
            await token.updateLockupAgent(accounts[0], true)
                .then(Utils.receiptShouldSucceed)

            let starting = parseInt(new Date().getTime() / 1000)
            await token.log(accounts[2], 1000, starting - 3601)

            result = await token.allowedBalance.call(
                accounts[2],
                starting,
                1000
            )
            await assert.equal(new BigNumber(result).valueOf(), 1000, "lockedBalance is not equal")
        });
        it('tokens are unlocked partialy according to releasePeriod', async function () {
            let token = await LockupContract.new(
                3600,// _lockPeriod,
                0,// _initialUnlock,
                500, // _releasePeriod
            )
            await token.updateLockupAgent(accounts[0], true)
                .then(Utils.receiptShouldSucceed)

            let starting = parseInt(new Date().getTime() / 1000)
            await token.log(accounts[2], 1000, starting)

            result = await token.allowedBalance.call(
                accounts[2],
                starting,
                1000
            )
            await assert.equal(new BigNumber(result).valueOf(), 0, "lockedBalance is not equal")
            result = await token.allowedBalance.call(
                accounts[2],
                starting+400,
                1000
            )
            await assert.equal(new BigNumber(result).valueOf(), 0, "lockedBalance is not equal")
            result = await token.allowedBalance.call(
                accounts[2],
                starting+501,
                1000
            )
            await assert.equal(new BigNumber(result).valueOf(), 138, "lockedBalance is not equal")
            result = await token.allowedBalance.call(
                accounts[2],
                starting+1001,
                1000
            )
            await assert.equal(new BigNumber(result).valueOf(), 277, "lockedBalance is not equal")
        });

        it('should not allow to transfer as all balance is locked', async function () {
            let token = await LockupContract.new(
                3600,// _lockPeriod,
                20,// _initialUnlock,
                100, // _releasePeriod
            )
            await token.updateLockupAgent(accounts[0], true)
            .then(Utils.receiptShouldSucceed)

            let starting = parseInt(new Date().getTime() / 1000 - 3600)
            await token.log(accounts[2], 0, starting)
            .then(Utils.receiptShouldSucceed)

            result = await token.allowedBalance.call(
                accounts[2],
                new BigNumber(starting).add(101),
                1000
            )

            await assert.equal(new BigNumber(result).valueOf(), 0, "lockedBalance is not equal")
            console.log(result);

            result = await token.isTransferAllowedTest.call(
                accounts[2],
                500,
                starting+101,
                1000
            )
            await assert.equal(result.valueOf(), false, "isTransferAllowedAllocation is not equal")
        });
    });

    it('check updateExcludedAddress', async function () {
        let token = await LockupContract.new(
            3600,// _lockPeriod,
            2,// _initialUnlock,
            0, // _releasePeriod
        )
        await assert.equal(await token.getExcludedAddress.call(accounts[0]), false, "getExcludedAddress is not equal")
        await token.updateExcludedAddress(accounts[0], true, {from: accounts[1]})
        .then(Utils.receiptShouldFailed).catch(Utils.catchReceiptShouldFailed)
        await assert.equal(await token.getExcludedAddress.call(accounts[0]), false, "getExcludedAddress is not equal")
        await token.updateExcludedAddress(accounts[0], true)
        .then(Utils.receiptShouldSucceed)
        await assert.equal(await token.getExcludedAddress.call(accounts[0]), true, "getExcludedAddress is not equal")
    });
});