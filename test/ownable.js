const abi = require('ethereumjs-abi')
const utils = require('./utils')
const Ownable = artifacts.require('Ownable')

contract('Ownable', accounts => {

  const owner = accounts[0];
  const newOwner = accounts[1];
  const notOwner = accounts[2];
  const notNewOwner = accounts[3];
  let instance = null;

  beforeEach(async () => { instance = await Ownable.new({ from: owner}) })

  it('should allow transfer ownership', async () => {
      await instance.transferOwnership(newOwner, {from: owner}).then(utils.receiptShouldSucceed)
  });

  it('should not allow transfer ownership', async () => {
      await instance.transferOwnership(newOwner, {from: notOwner}).then(utils.receiptShouldFailed).catch(utils.catchReceiptShouldFailed)
  });

  it('should allow accept ownership', async () => {
      await instance.transferOwnership(newOwner, {from: owner}).then(utils.receiptShouldSucceed)
      await instance.acceptOwnership({from: newOwner})
      assert.equal(await instance.owner.call(), newOwner, "owner is not equal")
  });

  it('should not allow accept ownership', async () => {
      await instance.transferOwnership(newOwner, {from: owner}).then(utils.receiptShouldSucceed)
      await instance.acceptOwnership({from: notNewOwner}).then(utils.receiptShouldSucceed)
      assert.equal(await instance.owner.call(), owner, "owner is not equal")
  });


});