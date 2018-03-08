const DDNSBankingFake = artifacts.require('./fakes/DDNSBankingFake.sol')

const assertRevert = require('./utils/assertRevert');
const watchEvent = require('./utils/watchEvent');
const constants = require('./utils/constants');

contract('DDNSBanking', ([owner, wallet, anotherAccount]) => {
	let sut;
	let events = [];

	before(() => {
		web3.eth.defaultAccount = owner;
	});

	beforeEach(async () => {
		sut = await DDNSBankingFake.new();
	});

	afterEach(() => {
		if (events.length) {
			events.forEach((ev) => {
				ev.stopWatching();
			});

			events = [];
		}
	});

	it("Owner address Should be set on instantiation", async () => {
		// Arrange
		// Act
		const ownerAddress = await sut.owner();
		// Assert
		assert.equal(ownerAddress, owner);
	});

	it("Wallet address Should be equal to the owner on instantiation", async () => {
		// Arrange
		// Act
		const ownerAddress = await sut.owner();
		const walletAddress = await sut.wallet();
		// Assert
		assert.equal(ownerAddress, walletAddress);
	});

	it("registrationCost Should be set to 1 ETH on instantiation", async () => {
		// Arrange
		const expectedCost = 1;
		// Act
		const cost = web3.fromWei(await sut.registrationCost());
		// Assert
		assert.equal(cost, expectedCost);
	});

	it("expiryPeriod Should be set to 1 year on instantiation", async () => {
		// Arrange
		// Act
		const expiryPeriod = await sut.expiryPeriod();
		// Assert
		assert.equal(expiryPeriod, constants.year);
	});

	it("changeRegistrationCost Should change registrationCost when invoked from owner", async () => {
		// Arrange
		const oldCost = web3.fromWei(await sut.registrationCost());
		const expectedCost = web3.toWei(2);
		// Act
		await sut.changeRegistrationCost(expectedCost, { from: owner });
		const newCost = await sut.registrationCost();
		// Assert
		assert.notEqual(oldCost, newCost, "Old cost is not different from the new cost!");
		assert.equal(expectedCost, newCost, "Expected cost is not equal to the new cost!");
	});

	it("changeRegistrationCost Should throw when invoked from non-owner", async () => {
		// Arrange
		const newCost = web3.toWei(2);
		// Act
		const result = sut.changeRegistrationCost(newCost, { from: anotherAccount });
		// Assert
		await assertRevert(result);
	});

	it("changeRegistrationCost Should raise LogCostChange event on valid call", async () => {
		// Arrange
		const newCost = web3.toWei(2);
		const event = sut.LogCostChange();
		events.push(event);
		let promiEvent = watchEvent(event);
		// Act
		await sut.changeRegistrationCost(newCost, { from: owner });
		const result = await promiEvent;
		// Assert
		assert.equal(result.args._newPrice, newCost);
	});

	it("changeExpiryPeriod Should change expiryPeriod when invoked from owner with valid arguments", async () => {
		// Arrange
		const newExpiryPeriod = constants.week + 1;
		// Act
		await sut.changeExpiryPeriod(newExpiryPeriod, { from: owner });
		const result = await sut.expiryPeriod();
		// Assert
		assert.equal(newExpiryPeriod, result);
	});

	it("changeExpiryPeriod Should throw when invoked from owner with invalid arguments", async () => {
		// Arrange
		const newExpiryPeriod = constants.week - 1;
		// Act
		const result = sut.changeExpiryPeriod(newExpiryPeriod, { from: owner });
		// Assert
		await assertRevert(result);
	});

	it("changeExpiryPeriod Should throw when invoked from non-owner", async () => {
		// Arrange
		const newExpiryPeriod = constants.week + 1;
		// Act
		const result = sut.changeExpiryPeriod(newExpiryPeriod, { from: anotherAccount });
		// Assert
		await assertRevert(result);
	});

	it("changeExpiryPeriod Should raise LogExpiryPeriodChange event on valid call", async () => {
		// Arrange
		const newExpiryPeriod = constants.week + 1;
		const event = sut.LogExpiryPeriodChange();
		let promiEvent = watchEvent(event);
		events.push(event);
		// Act
		await sut.changeExpiryPeriod(newExpiryPeriod, { from: owner });
		const result = await promiEvent;
		// Assert
		assert.equal(result.args._newPeriod, newExpiryPeriod);
	});

	it("changeWallet Should change wallet when invoked from owner with valid arguments", async () => {
		// Arrange
		// Act
		await sut.changeWallet(wallet, { from: owner });
		const newWallet = await sut.wallet();
		// Assert
		assert.equal(newWallet, wallet);
	});

	it("changeWallet Should throw when invoked from owner with invalid arguments", async () => {
		// Arrange
		// Act
		const result = sut.changeWallet(0x00, { from: owner });
		// Assert
		await assertRevert(result);
	});

	it("changeWallet Should throw when invoked from non-owner", async () => {
		// Arrange
		// Act
		const result = sut.changeWallet(wallet, { from: anotherAccount });
		// Assert
		await assertRevert(result);
	});

	it("changeWallet Should raise LogWalletChange event on valid call", async () => {
		// Arrange
		const event = sut.LogWalletChange();
		let promiEvent = watchEvent(event);
		events.push(event);
		// Act
		await sut.changeWallet(wallet, { from: owner });
		const result = await promiEvent;
		// Assert
		assert.equal(result.args._newWallet, wallet);
	});

	it("withdraw Should allocate specified amount when invoked from owner with valid arguments", async () => {
		// Arrange
		const transferValue = 42;
		await web3.eth.sendTransaction({ from: owner, to: sut.address, value: transferValue });

		await sut.changeWallet(wallet, { from: owner });
		const startBalance = await web3.eth.getBalance(wallet);
		// Act
		await sut.withdraw(transferValue, { from: owner });
		const newBalance = await web3.eth.getBalance(wallet);

		const contractBalance = await web3.eth.getBalance(sut.address);
		// Assert
		assert.equal(newBalance.toString(10), startBalance.plus(transferValue).toString(10), "New balance is not equal to startBalance plus transferValue.");
		assert.equal(contractBalance.toString(10), 0, "Contract has not transferred all funds.");
	});

	it("withdraw Should throw when invoked from owner with invalid arguments", async () => {
		// Arrange
		const transferValue = 42;
		const contractBalance = await web3.eth.getBalance(sut.address);
		// Act
		assert.equal(contractBalance.toString(10), 0);
		const result = sut.withdraw(transferValue, { from: owner });
		// Assert
		assertRevert(result);
	});

	it("withdraw Should throw when invoked from non-owner with valid arguments", async () => {
		// Arrange
		const transferValue = 42;
		await web3.eth.sendTransaction({ from: owner, to: sut.address, value: transferValue });
		// Act
		const result = sut.withdraw(transferValue, { from: anotherAccount });
		// Assert
		assertRevert(result);
	});

	it("withdraw Should raise LogWithdrawal event on valid call", async () => {
		// Arrange
		const transferValue = 42;
		await web3.eth.sendTransaction({ from: owner, to: sut.address, value: transferValue });

		const event = sut.LogWithdrawal();
		let promiEvent = watchEvent(event);
		events.push(event);
		// Act
		await sut.withdraw(transferValue, { from: owner });
		const result = await promiEvent;
		// Assert
		assert.equal(result.args._invoker, owner, "Owner is not logged as invoker.");
		assert.equal(result.args._wallet, owner, "Owner is not logged as wallet.");
		assert.equal(result.args._amount.toString(10), transferValue, "Wrong transfer value.");
	});
})