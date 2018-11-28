const abi = require('ethereumjs-abi')
const utils = require('./utils')
const BigNumber = require('bignumber.js')

const DistributedDirectContributionForwarder = artifacts.require('test/DistributedDirectContributionForwarder')


contract('DistributedDirectContributionForwarder', accounts => {

  describe('DistributedDirectContributionForwarder', () => {
    it('it should forward to receivers', async () => {
      const owner = accounts[0]
      const receiver1 = accounts[2]
      const receiver2 = accounts[3]
      const proportionAbsMax = 100
      const receivers = [receiver1, receiver2]
      const proportions = [90, 10]
      let res;

      const forwarder = await DistributedDirectContributionForwarder.new(proportionAbsMax, receivers, proportions, {from: owner})

      res = await web3.eth.getBalance(receiver1);
      const balance1Before = new BigNumber(res.valueOf())

      res = await web3.eth.getBalance(receiver2);
      const balance2Before = new BigNumber(res.valueOf())

      await forwarder.forward({ from: owner, value: web3.toWei('0.000000000001', 'ether')}).then(utils.receiptShouldSucceed)

      const balanceShouldBe1 = balance1Before.plus(new BigNumber(900000));
      const balanceShouldBe2 = balance2Before.plus(new BigNumber(100000));

      res = await web3.eth.getBalance(receiver1)
      assert.equal(res.valueOf() === balanceShouldBe1.toString(), true, "balance doesn't match");

      res = await web3.eth.getBalance(receiver2)
      assert.equal(res.valueOf() === balanceShouldBe2.toString(), true, "balance doesn't match");

    });
  });
});
