const abi = require('ethereumjs-abi')
const BigNumber = require('bignumber.js')
const BN = require('bn.js')

const Utils = require("./utils");
const CompanyFabric = artifacts.require('test/CompanyFabricTest')
const Company = artifacts.require('test/CompanyTest')
const Management = artifacts.require("Management.sol")

const precision = new BigNumber("1000000000000000000");
const CAN_CREATE_COMPANY = 1;
const CAN_SUSPEND_RESUME_RECOGNIZING = 1;
const CAN_SIGN_TRANSACTION = 3;
const CAN_MINT_TOKENS = 4;

const CONTRACT_COMPANY_FABRIC = 1;

const signAddress = web3.eth.accounts[7];
const rewardAddress = web3.eth.accounts[8];
const ownerAddress = web3.eth.accounts[9];

let startAt = parseInt(new Date().getTime() / 1000) + 3600;
let periodDuration = 604800;//oneWeek
let periodTotalSupply = new BigNumber('1000').mul(precision);

async function makeTransaction(instance, sign, address, amount, timestamp) {
    'use strict';
    var h = abi.soliditySHA3(['address', 'uint256', 'uint256'], [new BN(address.substr(2), 16), amount, timestamp]),
        sig = web3.eth.sign(sign, h.toString('hex')).slice(2),
        r = `0x${sig.slice(0, 64)}`,
        s = `0x${sig.slice(64, 128)}`,
        v = web3.toDecimal(sig.slice(128, 130)) + 27;

    var data = abi.simpleEncode('claimTokens(uint256,uint256,uint8,bytes32,bytes32)', amount, timestamp, v, r, s);

    return instance.sendTransaction({from: address, data: data.toString('hex')});
}

contract('Company', accounts => {

    let fabric = null
    let company = null
    let management = null;

    beforeEach(async () => {
        management = await Management.new();
        fabric = await CompanyFabric.new(management.address)
    })

    describe('company', () => {

        it('check state | isRecognizingPeriodsInProgress | updateCompanyState', async () => {
            await management.registerContract(CONTRACT_COMPANY_FABRIC, fabric.address)
                .then(Utils.receiptShouldSucceed);
            await management.setPermission(accounts[1], CAN_CREATE_COMPANY, true)
                .then(Utils.receiptShouldSucceed);

            const { logs } = await fabric.createCompany(
                ownerAddress,
                rewardAddress,
                startAt,
                periodDuration,
                periodTotalSupply,
                'Test',
                18,
                {from: accounts[1]}
            )

            company = Company.at(logs[0].args.companyAddress);

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

        it('check first period claimTokens | getCurrentPeriod | getBalancesIndex', async () => {
            await management.registerContract(CONTRACT_COMPANY_FABRIC, fabric.address)
                .then(Utils.receiptShouldSucceed);
            await management.setPermission(accounts[1], CAN_CREATE_COMPANY, true)
                .then(Utils.receiptShouldSucceed);
            await management.setPermission(signAddress, CAN_SIGN_TRANSACTION, true)
                .then(Utils.receiptShouldSucceed);

            const { logs } = await fabric.createCompany(
                ownerAddress,
                rewardAddress,
                startAt,
                periodDuration,
                periodTotalSupply,
                'Test',
                18,
                {from: accounts[1]}
            )

            company = Company.at(logs[0].args.companyAddress);

            await makeTransaction(
                company,
                accounts[3],
                accounts[1],
                new BigNumber('100').mul(precision).valueOf(),
                new BigNumber(startAt).sub(periodDuration * 2).valueOf()
            )
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);

            await makeTransaction(
                company,
                signAddress,
                accounts[1],
                new BigNumber('100').mul(precision).valueOf(),
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
                new BigNumber('100').mul(precision).valueOf(),
                new BigNumber(startAt).sub(periodDuration / 2).valueOf()
            )
                .then(Utils.receiptShouldSucceed);


            assert.equal(await company.getCurrentPeriod.call(), 0, 'getCurrentPeriod is not equal');
            assert.equal(await company.getBalancesIndex.call(), 0, 'getBalancesIndex is not equal');
            assert.equal(await company.isTotalSupplySynced.call(), true, 'isTotalSupplySynced is not equal');
            assert.equal(await company.balanceOf.call(accounts[0]), new BigNumber(0).valueOf(), 'balanceOf is not equal');
            assert.equal(await company.balanceOf.call(accounts[1]), new BigNumber('100').mul(precision).valueOf(), 'balanceOf is not equal');

        });

    });
});