const abi = require('ethereumjs-abi')
const BigNumber = require('bignumber.js')
const BN = require('bn.js')

const Utils = require("./utils");
const Company = artifacts.require('test/CompanyTokenTest')
const Management = artifacts.require("Management.sol")

const precision = new BigNumber("1000000000000000000");
const CAN_CREATE_COMPANY = 1;
const CAN_SUSPEND_RESUME_RECOGNIZING = 2;
const CAN_SIGN_TRANSACTION = 3;
const CAN_MINT_TOKENS = 4;
const CAN_UPDATE_STATE = 5;

const signAddress = web3.eth.accounts[7];
const rewardAddress = web3.eth.accounts[8];
const ownerAddress = web3.eth.accounts[9];

let startAt = parseInt(new Date().getTime() / 1000) + 3600;
let periodDuration = 604800;//oneWeek
let periodTotalSupply = new BigNumber('0').mul(precision);
let initialBalance = new BigNumber('100').mul(precision);

async function makeTransaction(instance, sign, address, timestamp) {
    'use strict';
    var h = abi.soliditySHA3(['address', 'uint256'], [new BN(address.substr(2), 16), timestamp]),
        sig = web3.eth.sign(sign, h.toString('hex')).slice(2),
        r = `0x${sig.slice(0, 64)}`,
        s = `0x${sig.slice(64, 128)}`,
        v = web3.toDecimal(sig.slice(128, 130)) + 27;

    var data = abi.simpleEncode('claimTokens(uint256,uint8,bytes32,bytes32)', timestamp, v, r, s);

    return instance.sendTransaction({from: address, data: data.toString('hex')});
}

contract('CompanyToken', accounts => {

    let company = null
    let management = null

    beforeEach(async () => {
        management = await Management.new();

        company = await Company.new(
            management.address,
            rewardAddress,
            startAt,
            periodDuration,
            periodTotalSupply,
            'Test',
            18,
            initialBalance
        )
    })

    describe('CompanyToken', () => {
/*
        it('check state', async () => {
            await Utils.checkState({company}, {
                company: {
                    companyState: 0,// BeforeRecognizingPeriod
                    rewardExchangeAddress: rewardAddress,
                    startAt: startAt,
                    periodDuration: periodDuration,
                    totalSupplySyncedAtPeriodIndex: 0,
                    decimals: 18,
                    name: 'TestTHX',
                    symbol: 'THX',
                    standard: 'ERC20 0.1',
                    maxSupply: periodTotalSupply,
                }
            });

            assert.equal(await company.isRecognizingPeriodsInProgress.call(), false, 'isRecognizingPeriodsInProgress is not equal');
            await company.updateCompanyState()
                .then(Utils.receiptShouldSucceed);
            assert.equal(await company.isRecognizingPeriodsInProgress.call(), false, 'isRecognizingPeriodsInProgress is not equal');

            await company.changeStartAtTest(parseInt(new Date().getTime() / 1000) - 3600)
                .then(Utils.receiptShouldSucceed);

            assert.equal(await company.isRecognizingPeriodsInProgress.call(), false, 'isRecognizingPeriodsInProgress is not equal');
            await company.updateCompanyState()
                .then(Utils.receiptShouldSucceed);
            assert.equal(await company.isRecognizingPeriodsInProgress.call(), true, 'isRecognizingPeriodsInProgress is not equal');

        });

        it('check for two first periods claimTokens | verify', async () => {
            await management.setPermission(signAddress, CAN_SIGN_TRANSACTION, true)
                .then(Utils.receiptShouldSucceed);

            await makeTransaction(
                company,
                accounts[3],
                accounts[1],
                new BigNumber(startAt).sub(periodDuration * 2).valueOf()
            )
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);

            await makeTransaction(
                company,
                signAddress,
                accounts[1],
                new BigNumber(startAt).sub(periodDuration / 2).valueOf()
            )
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);

            await company.changeStartAtTest(parseInt(new Date().getTime() / 1000) - 3600)
                .then(Utils.receiptShouldSucceed);
            await company.updateCompanyState()
                .then(Utils.receiptShouldSucceed);

            await makeTransaction(
                company,
                signAddress,
                accounts[1],
                new BigNumber(startAt).sub(periodDuration / 2).valueOf()
            )
                .then(Utils.receiptShouldSucceed);

            await makeTransaction(
                company,
                signAddress,
                accounts[1],
                new BigNumber(startAt).sub(periodDuration / 2).valueOf()
            )
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);

            assert.equal(await company.getCurrentPeriod.call(), 0, 'getCurrentPeriod is not equal');
            assert.equal(await company.isTotalSupplySynced.call(), true, 'isTotalSupplySynced is not equal');
            assert.equal(await company.balanceOf.call(accounts[0]), new BigNumber(0).valueOf(), 'balanceOf is not equal');
            assert.equal(await company.balanceOf.call(accounts[1]), new BigNumber('100').mul(precision).valueOf(), 'balanceOf is not equal');
            assert.equal(await company.totalSupply.call(), new BigNumber('100').mul(precision).valueOf(), 'balanceOf is not equal');

            let newStartAt = new BigNumber(parseInt(new Date().getTime() / 1000) - 3600).sub(periodDuration);
            await company.changeStartAtTest(newStartAt)
                .then(Utils.receiptShouldSucceed);

            assert.equal(await company.getCurrentPeriod.call(), 1, 'getCurrentPeriod is not equal');
            assert.equal(await company.isTotalSupplySynced.call(), false, 'isTotalSupplySynced is not equal');
            assert.equal(await company.balanceOf.call(accounts[0]), new BigNumber(0).valueOf(), 'balanceOf is not equal');
            assert.equal(await company.balanceOf.call(accounts[1]), new BigNumber(0).mul(precision).valueOf(), 'balanceOf is not equal');
            assert.equal(await company.totalSupply.call(), new BigNumber(0).mul(precision).valueOf(), 'balanceOf is not equal');

            await makeTransaction(
                company,
                signAddress,
                accounts[0],
                new BigNumber(startAt).sub(periodDuration / 2).valueOf()
            )
                .then(Utils.receiptShouldSucceed);

            assert.equal(await company.getCurrentPeriod.call(), 1, 'getCurrentPeriod is not equal');
            assert.equal(await company.isTotalSupplySynced.call(), true, 'isTotalSupplySynced is not equal');
            assert.equal(await company.balanceOf.call(accounts[0]), new BigNumber('100').mul(precision).valueOf(), 'balanceOf is not equal');
            assert.equal(await company.balanceOf.call(accounts[1]), new BigNumber(0).mul(precision).valueOf(), 'balanceOf is not equal');
            assert.equal(await company.totalSupply.call(), new BigNumber('100').mul(precision).valueOf(), 'balanceOf is not equal');

            await company.changeRecognizingPeriodState(false, {from: accounts[3]})
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);

            await management.setPermission(accounts[3], CAN_SUSPEND_RESUME_RECOGNIZING, true)
                .then(Utils.receiptShouldSucceed);

            await company.changeRecognizingPeriodState(false, {from: accounts[3]})
                .then(Utils.receiptShouldSucceed);


            await makeTransaction(
                company,
                signAddress,
                accounts[0],
                new BigNumber(startAt).sub(periodDuration / 2).valueOf()
            )
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);
        });
*/
        it('check calculateTokensAmount | increaseSpentTokens | transfer | transferFrom | updateInitialBalanceValue', async () => {
            await management.setPermission(signAddress, CAN_SIGN_TRANSACTION, true)
                .then(Utils.receiptShouldSucceed);

            await company.changeStartAtTest(parseInt(new Date().getTime() / 1000) - 3600)
                .then(Utils.receiptShouldSucceed);
            await company.updateCompanyState()
                .then(Utils.receiptShouldSucceed);

            await makeTransaction(
                company,
                signAddress,
                accounts[1],
                new BigNumber(startAt).sub(periodDuration / 2).valueOf()
            )
                .then(Utils.receiptShouldSucceed);

            assert.equal(await company.getCurrentPeriod.call(), 0, 'getCurrentPeriod is not equal');
            assert.equal(await company.isTotalSupplySynced.call(), true, 'isTotalSupplySynced is not equal');
            assert.equal(await company.balanceOf.call(accounts[0]), new BigNumber(0).valueOf(), 'balanceOf is not equal');
            assert.equal(await company.balanceOf.call(accounts[1]), new BigNumber('100').mul(precision).valueOf(), 'balanceOf is not equal');
            assert.equal(await company.totalSupply.call(), new BigNumber('100').mul(precision).valueOf(), 'balanceOf is not equal');

            let newStartAt = new BigNumber(parseInt(new Date().getTime() / 1000) - 3600).sub(periodDuration);
            await company.changeStartAtTest(newStartAt)
                .then(Utils.receiptShouldSucceed);

            assert.equal(await company.getCurrentPeriod.call(), 1, 'getCurrentPeriod is not equal');
            assert.equal(await company.isTotalSupplySynced.call(), false, 'isTotalSupplySynced is not equal');
            assert.equal(await company.balanceOf.call(accounts[0]), new BigNumber(0).valueOf(), 'balanceOf is not equal');
            assert.equal(await company.balanceOf.call(accounts[1]), new BigNumber(0).mul(precision).valueOf(), 'balanceOf is not equal');
            assert.equal(await company.totalSupply.call(), new BigNumber(0).mul(precision).valueOf(), 'balanceOf is not equal');

            await makeTransaction(
                company,
                signAddress,
                accounts[1],
                new BigNumber(startAt).sub(periodDuration / 2).valueOf()
            )
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);

            newStartAt = new BigNumber(parseInt(new Date().getTime() / 1000) - 3600).sub(periodDuration * 2);
            await company.changeStartAtTest(newStartAt)
                .then(Utils.receiptShouldSucceed);

            assert.equal(await company.getCurrentPeriod.call(), 2, 'getCurrentPeriod is not equal');
            assert.equal(await company.isTotalSupplySynced.call(), false, 'isTotalSupplySynced is not equal');
            assert.equal(await company.balanceOf.call(accounts[1]), new BigNumber(0).mul(precision).valueOf(), 'balanceOf is not equal');
            assert.equal(await company.totalSupply.call(), new BigNumber(0).mul(precision).valueOf(), 'balanceOf is not equal');

            await company.updateInitialBalanceValue(new BigNumber('1000').mul(precision), {from: accounts[5]})
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);
            await management.setPermission(accounts[5], CAN_UPDATE_STATE, true)
                .then(Utils.receiptShouldSucceed);
            await company.updateInitialBalanceValue(new BigNumber('1000').mul(precision), {from: accounts[5]})
                .then(Utils.receiptShouldSucceed);

            await makeTransaction(
                company,
                signAddress,
                accounts[1],
                new BigNumber(startAt).sub(periodDuration / 2).valueOf()
            )
                .then(Utils.receiptShouldSucceed);

            await company.transfer(accounts[3], new BigNumber('700').mul(precision).valueOf(), {from: accounts[1]})
                .then(Utils.receiptShouldSucceed);

            await company.approve(accounts[2], new BigNumber('200').mul(precision).valueOf(), {from: accounts[1]});

            await company.transferFrom(accounts[1], accounts[3], new BigNumber('200').mul(precision).valueOf(), {from: accounts[2]})
                .then(Utils.receiptShouldSucceed);

            assert.equal(await company.getCurrentPeriod.call(), 2, 'getCurrentPeriod is not equal');
            assert.equal(await company.isTotalSupplySynced.call(), true, 'isTotalSupplySynced is not equal');
            assert.equal(await company.balanceOf.call(accounts[1]), new BigNumber('100').mul(precision).valueOf(), 'balanceOf is not equal');
            assert.equal(await company.balanceOf.call(accounts[3]), new BigNumber('900').mul(precision).valueOf(), 'balanceOf is not equal');
            assert.equal(await company.totalSupply.call(), new BigNumber('1000').mul(precision).valueOf(), 'balanceOf is not equal');

            newStartAt = new BigNumber(parseInt(new Date().getTime() / 1000) - 3600).sub(periodDuration * 3);
            await company.changeStartAtTest(newStartAt)
                .then(Utils.receiptShouldSucceed);

            assert.equal(await company.getCurrentPeriod.call(), 3, 'getCurrentPeriod is not equal');
            assert.equal(await company.isTotalSupplySynced.call(), false, 'isTotalSupplySynced is not equal');
            assert.equal(await company.balanceOf.call(accounts[1]), new BigNumber(0).mul(precision).valueOf(), 'balanceOf is not equal');
            assert.equal(await company.balanceOf.call(accounts[3]), new BigNumber(0).mul(precision).valueOf(), 'balanceOf is not equal');
            assert.equal(await company.totalSupply.call(), new BigNumber(0).mul(precision).valueOf(), 'balanceOf is not equal');

            await makeTransaction(
                company,
                signAddress,
                accounts[1],
                new BigNumber(startAt).sub(periodDuration / 2).valueOf()
            )
                .then(Utils.receiptShouldSucceed);

            //prev initial balance = 1000
            //prev spent   balance = 900
            //curr initial balance = 1000
            //1000 * 2 * (900 * 100% / 1000) = 180 000

            assert.equal(await company.getCurrentPeriod.call(), 3, 'getCurrentPeriod is not equal');
            assert.equal(await company.isTotalSupplySynced.call(), true, 'isTotalSupplySynced is not equal');
            assert.equal(await company.balanceOf.call(accounts[1]), new BigNumber('180000').mul(precision).valueOf(), 'balanceOf is not equal');
            assert.equal(await company.balanceOf.call(accounts[3]), new BigNumber('0').mul(precision).valueOf(), 'balanceOf is not equal');
            assert.equal(await company.totalSupply.call(), new BigNumber('180000').mul(precision).valueOf(), 'balanceOf is not equal');

        });

    });
});