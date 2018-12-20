const abi = require('ethereumjs-abi')
const BigNumber = require('bignumber.js')
const BN = require('bn.js')

const Utils = require("./utils");
const Company = artifacts.require('test/CompanyThankYouTokenTest')
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
let periodTotalSupply = new BigNumber('1000').mul(precision);

contract('ThankYouToken', accounts => {

    let company = null
    let management = null;

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
        )
    })

    describe('ThankYouToken', () => {

        it('check state | isRecognizingPeriodsInProgress | updateCompanyState', async () => {
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

        it('check getCurrentPeriod | isTotalSupplySynced | balanceOf | totalSupply | changeRecognizingPeriodState', async () => {
            await management.setPermission(accounts[0], CAN_MINT_TOKENS, true)
                .then(Utils.receiptShouldSucceed);

            await company.changeStartAtTest(parseInt(new Date().getTime() / 1000) - 3600)
                .then(Utils.receiptShouldSucceed);
            await company.updateCompanyState()
                .then(Utils.receiptShouldSucceed);

            await company.mint(accounts[1], new BigNumber('100').mul(precision).valueOf())
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

            await company.setTotalSupplySyncedTest()
                .then(Utils.receiptShouldSucceed);
            await company.mint(accounts[0], new BigNumber('100').mul(precision).valueOf())
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
        });

        it('check transfers', async () => {
            await company.changeStartAtTest(parseInt(new Date().getTime() / 1000) - 3600)
                .then(Utils.receiptShouldSucceed);
            await company.updateCompanyState()
                .then(Utils.receiptShouldSucceed);

            await management.setPermission(accounts[0], CAN_MINT_TOKENS, true)
                .then(Utils.receiptShouldSucceed);
            await company.setTotalSupplySyncedTest()
                .then(Utils.receiptShouldSucceed);

            await company.mint(accounts[0], new BigNumber('100').mul(precision).valueOf())
                .then(Utils.receiptShouldSucceed);
            await company.mint(accounts[1], new BigNumber('928').mul(precision).valueOf())
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);
            await company.mint(accounts[1], new BigNumber('900').mul(precision).valueOf())
                .then(Utils.receiptShouldSucceed);

            assert.equal(await company.getCurrentPeriod.call(), 0, 'getCurrentPeriod is not equal');
            assert.equal(await company.isTotalSupplySynced.call(), true, 'isTotalSupplySynced is not equal');
            assert.equal(await company.balanceOf.call(accounts[0]), new BigNumber('100').mul(precision).valueOf(), 'balanceOf is not equal');
            assert.equal(await company.balanceOf.call(accounts[1]), new BigNumber('900').mul(precision).valueOf(), 'balanceOf is not equal');
            assert.equal(await company.totalSupply.call(), new BigNumber('1000').mul(precision).valueOf(), 'balanceOf is not equal');


            await company.transfer(accounts[2], new BigNumber('50').mul(precision).valueOf(), {from: accounts[0]})
                .then(Utils.receiptShouldSucceed);

            await company.approve(accounts[3], new BigNumber('100').mul(precision).valueOf(), {from: accounts[1]});

            await company.transferFrom(accounts[1], accounts[4], new BigNumber('100').mul(precision).valueOf(), {from: accounts[3]})
                .then(Utils.receiptShouldSucceed);

            assert.equal(await company.getCurrentPeriod.call(), 0, 'getCurrentPeriod is not equal');
            assert.equal(await company.isTotalSupplySynced.call(), true, 'isTotalSupplySynced is not equal');
            assert.equal(await company.balanceOf.call(accounts[0]), new BigNumber('50').mul(precision).valueOf(), 'balanceOf is not equal');
            assert.equal(await company.balanceOf.call(accounts[1]), new BigNumber('800').mul(precision).valueOf(), 'balanceOf is not equal');
            assert.equal(await company.balanceOf.call(accounts[2]), new BigNumber('50').mul(precision).valueOf(), 'balanceOf is not equal');
            assert.equal(await company.balanceOf.call(accounts[4]), new BigNumber('100').mul(precision).valueOf(), 'balanceOf is not equal');
            assert.equal(await company.totalSupply.call(), new BigNumber('1000').mul(precision).valueOf(), 'balanceOf is not equal');

        });

        it('check transfers', async () => {

            await company.changeStartAtTest(parseInt(new Date().getTime() / 1000) - 3600)
                .then(Utils.receiptShouldSucceed);
            await company.updateCompanyState()
                .then(Utils.receiptShouldSucceed);

            await management.setPermission(accounts[0], CAN_MINT_TOKENS, true)
                .then(Utils.receiptShouldSucceed);
            await company.setTotalSupplySyncedTest()
                .then(Utils.receiptShouldSucceed);

            await company.mint(accounts[0], '100000000000000000000')
                .then(Utils.receiptShouldSucceed);

            await company.mint(accounts[1], '1000000000000000000000')
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);

            await company.mint(accounts[1], '900000000000000000001')
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);
            await company.mint(accounts[1], '900000000000000000000')
                .then(Utils.receiptShouldSucceed);

            await company.transfer(0x0, new BigNumber('50').mul(precision).valueOf(), {from: accounts[0]})
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);

            await company.changeStartAtTest(parseInt(new Date().getTime() / 1000) - 3600 - periodDuration)
                .then(Utils.receiptShouldSucceed);
            await company.updateCompanyState()
                .then(Utils.receiptShouldSucceed);

            await company.transfer(accounts[3], new BigNumber('50').mul(precision).valueOf(), {from: accounts[0]})
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);

            await company.changeStartAtTest(parseInt(new Date().getTime() / 1000) - 3600)
                .then(Utils.receiptShouldSucceed);
            await company.updateCompanyState()
                .then(Utils.receiptShouldSucceed);


            var { logs } = await company.transfer(accounts[3], new BigNumber('50').mul(precision).valueOf(), {from: accounts[0]})

            assert.equal(logs[0].args.from, accounts[0], 'Transfer from is not equal');
            assert.equal(logs[0].args.to, accounts[3], 'Transfer to is not equal');
            assert.equal(logs[0].args.value, new BigNumber('50').mul(precision).valueOf(), 'Transfer value is not equal');

            assert.equal(logs[0].args.from, accounts[0], 'RecognizeSent from is not equal');
            assert.equal(logs[0].args.to, accounts[3], 'RecognizeSent to is not equal');
            assert.equal(logs[0].args.value, new BigNumber('50').mul(precision).valueOf(), 'RecognizeSent value is not equal');

            var { logs } = await company.transfer(accounts[3], new BigNumber('28').mul(precision).valueOf(), {from: accounts[0]})

            assert.equal(logs[0].args.from, accounts[0], 'Transfer from is not equal');
            assert.equal(logs[0].args.to, accounts[3], 'Transfer to is not equal');
            assert.equal(logs[0].args.value, new BigNumber('28').mul(precision).valueOf(), 'Transfer value is not equal');

            assert.equal(logs[0].args.from, accounts[0], 'RewardExchanged from is not equal');
            assert.equal(logs[0].args.value, new BigNumber('28').mul(precision).valueOf(), 'RewardExchanged value is not equal');
        });

    });
});