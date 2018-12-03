const abi = require('ethereumjs-abi')
const BigNumber = require('bignumber.js')

const Utils = require("./utils");
const CompanyFabric = artifacts.require('CompanyFabric')
const Company = artifacts.require('Company')
const Management = artifacts.require("Management.sol")

const precision = new BigNumber("1000000000000000000");
const CAN_CREATE_COMPANY = 1;
const CAN_SUSPEND_RESUME_RECOGNIZING = 1;
const CAN_SIGN_TRANSACTION = 3;
const CAN_MINT_TOKENS = 4;

const CONTRACT_COMPANY_FABRIC = 1;

const rewardAddress = web3.eth.accounts[8];
const ownerAddress = web3.eth.accounts[9];

let startAt = parseInt(new Date().getTime() / 1000) + 3600;
let periodDuration = 604800;//oneWeek
let periodTotalSupply = new BigNumber('1000').mul(precision);

contract('CompanyFabric', accounts => {

    let fabric = null
    let company = null
    let management = null;

    beforeEach(async () => {
        management = await Management.new();
        fabric = await CompanyFabric.new(management.address)
    })

    describe('createCompany', () => {

        it('check that only allowed address can create company', async () => {
            await fabric.createCompany(
                ownerAddress,
                rewardAddress,
                startAt,
                periodDuration,
                periodTotalSupply,
                'Test',
                18,
                {from: accounts[1]}
            )
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);

            await management.registerContract(CONTRACT_COMPANY_FABRIC, fabric.address)
                .then(Utils.receiptShouldSucceed);
            await management.setPermission(accounts[1], CAN_CREATE_COMPANY, true)
                .then(Utils.receiptShouldSucceed);

            await fabric.createCompany(
                ownerAddress,
                rewardAddress,
                startAt,
                periodDuration,
                periodTotalSupply,
                'Test',
                18,
                {from: accounts[1]}
            )
                .then(Utils.receiptShouldSucceed);
        });

        it('check if company exist | company owner', async () => {
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
            assert.equal(logs.length, 1);
            assert.equal(logs[0].event, 'CompanyCreated');

            assert.equal(await fabric.isCompanyExists.call(logs[0].args.companyAddress), true);
            assert.equal(await fabric.isCompanyExists.call(accounts[3]), false);

            company = Company.at(logs[0].args.companyAddress);

            assert.equal(await company.owner.call(), fabric.address);
            assert.equal(await company.pendingOwner.call(), ownerAddress);
        });

        it('check creating company parameters', async () => {
            await management.registerContract(CONTRACT_COMPANY_FABRIC, fabric.address)
                .then(Utils.receiptShouldSucceed);
            await management.setPermission(accounts[1], CAN_CREATE_COMPANY, true)
                .then(Utils.receiptShouldSucceed);

            await fabric.createCompany(
                0x0,
                rewardAddress,
                startAt,
                periodDuration,
                periodTotalSupply,
                'Test',
                18,
                {from: accounts[1]}
            )
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);

            await fabric.createCompany(
                ownerAddress,
                0x0,
                startAt,
                periodDuration,
                periodTotalSupply,
                'Test',
                18,
                {from: accounts[1]}
            )
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);

            await fabric.createCompany(
                ownerAddress,
                rewardAddress,
                parseInt(new Date().getTime() / 1000) - 3600,
                periodDuration,
                periodTotalSupply,
                'Test',
                18,
                {from: accounts[1]}
            )
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);

            await fabric.createCompany(
                ownerAddress,
                rewardAddress,
                startAt,
                0,
                periodTotalSupply,
                'Test',
                18,
                {from: accounts[1]}
            )
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);

            await fabric.createCompany(
                ownerAddress,
                rewardAddress,
                startAt,
                periodDuration,
                0,
                'Test',
                18,
                {from: accounts[1]}
            )
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);

            await fabric.createCompany(
                ownerAddress,
                rewardAddress,
                startAt,
                periodDuration,
                periodTotalSupply,
                'Test',
                18,
                {from: accounts[1]}
            )
                .then(Utils.receiptShouldSucceed);
        });

    });
});