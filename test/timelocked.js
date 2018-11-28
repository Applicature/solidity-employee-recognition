const abi = require('ethereumjs-abi')
const utils = require('./utils')
const TimeLocked = artifacts.require('test/TimeLockedTest')

contract('TimeLocked', accounts => {


  it('should be locked', async () => {
      const time = 1577750400; ///  12/31/2019
      const instance = await TimeLocked.new(time, { from: accounts[0]})

      await instance.shouldBeLocked({from: accounts[0]}).then(utils.receiptShouldSucceed)
      await instance.shouldBeUnLocked({from: accounts[0]}).catch(utils.catchReceiptShouldFailed)
  });

  it('should be un locked', async () => {
      const time = 1483228800; ///  01/01/2017
      const instance = await TimeLocked.new(time, { from: accounts[0]})

      await instance.shouldBeUnLocked({from: accounts[0]}).then(utils.receiptShouldSucceed)
      await instance.shouldBeLocked({from: accounts[0]}).catch(utils.catchReceiptShouldFailed)
  });

});
