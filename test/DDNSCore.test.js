const DDNSCore = artifacts.require('../contracts/DDNSCore.sol')

const assertRevert = require('./utils/assertRevert');
const watchEvent = require('./utils/watchEvent');
const constants = require('./utils/constants');
const increaseTime = require('./utils/increaseTime');

contract('DDNSCore', ([owner, wallet, anotherAccount]) => {
	let sut;
	let events = [];

	before(() => {
		web3.eth.defaultAccount = owner;
	});

	beforeEach(async () => {
		sut = await DDNSCore.new();
	});

	afterEach(() => {
		if (events.length) {
			events.forEach((ev) => {
				ev.stopWatching();
			});

			events = [];
		}
	});

	it("BYTES_DEFAULT_VALUE constant Should have exact value", async () => {
		// Arrange
		// Act
		const result = await sut.BYTES_DEFAULT_VALUE();
		// Assert
		assert.equal(result, '0x00');
	});

	it("DOMAIN_NAME_MIN_LENGTH constant Should have exact value", async () => {
		// Arrange
		// Act
		const result = await sut.DOMAIN_NAME_MIN_LENGTH();
		// Assert
		assert.equal(result, 5);
	});

	it("IP_ADDRESS_MIN_LENGTH constant Should have exact value", async () => {
		// Arrange
		// Act
		const result = await sut.IP_ADDRESS_MIN_LENGTH();
		// Assert
		assert.equal(result, 6);
	});

	it("TOP_LEVEL_DOMAIN_MIN_LENGTH constant Should have exact value", async () => {
		// Arrange
		// Act
		const result = await sut.TOP_LEVEL_DOMAIN_MIN_LENGTH();
		// Assert
		assert.equal(result, 1);
	});

	it("PRICE_INCREASE_BOUND_INDEX constant Should have exact value", async () => {
		// Arrange
		// Act
		const result = await sut.PRICE_INCREASE_BOUND_INDEX();
		// Assert
		assert.equal(result, 9);
	});

	it("registerDomain Should throw when the passed domain name is shorter than or equal to DOMAIN_NAME_MIN_LENGTH", async () => {
		// Arrange
		const shortDomainName = "short";
		const ip = "127.0.0.1";
		const topLevelDomain = "co.uk";
		const currentPrice = await sut.registrationCost();
		// Act
		const result = sut.registerDomain(shortDomainName, ip, topLevelDomain, { from: anotherAccount, value: currentPrice });
		// Assert
		await assertRevert(result);
	});

	it("registerDomain Should throw when the passed ip address is shorter than or equal to IP_ADDRESS_MIN_LENGTH", async () => {
		// Arrange
		const domainName = "notshortanymore";
		const shortIp = "0.0.1";
		const topLevelDomain = "co.uk";
		const currentPrice = await sut.registrationCost();
		// Act
		const result = sut.registerDomain(domainName, shortIp, topLevelDomain, { from: anotherAccount, value: currentPrice });
		// Assert
		await assertRevert(result);
	});

	it("registerDomain Should throw when the passed top-level domain is shorter than or equal to TOP_LEVEL_DOMAIN_MIN_LENGTH", async () => {
		// Arrange
		const domainName = "notshortanymore";
		const ip = "127.0.0.1";
		const shortTopLevelDomain = "c";
		const currentPrice = await sut.registrationCost();
		// Act
		const result = sut.registerDomain(domainName, ip, shortTopLevelDomain, { from: anotherAccount, value: currentPrice });
		// Assert
		await assertRevert(result);
	});

	it("registerDomain Should throw when the sent funds are insufficient", async () => {
		// Arrange
		const domainName = "notshortanymore";
		const ip = "127.0.0.1";
		const topLevelDomain = "co.uk";
		const currentPrice = (await sut.registrationCost()).minus(1);
		// Act
		const result = sut.registerDomain(domainName, ip, topLevelDomain, { from: anotherAccount, value: currentPrice });
		// Assert
		await assertRevert(result);
	});

	it("registerDomain Should throw when domain with such name is registered and still valid", async () => {
		// Arrange
		const domainName = "notshortanymore";
		const ip = "127.0.0.1";
		const topLevelDomain = "co.uk";
		const currentPrice = await sut.registrationCost();
		// Act
		await sut.registerDomain(domainName, ip, topLevelDomain, { from: anotherAccount, value: currentPrice });
		const result = sut.registerDomain(domainName, ip, topLevelDomain, { from: anotherAccount, value: currentPrice });
		// Assert
		await assertRevert(result);
	});

	it("registerDomain Should raise LogNewDomain event when domain with such name has not been registered before", async () => {
		// Arrange
		const domainName = "notshortanymore";
		const ip = "127.0.0.1";
		const topLevelDomain = "co.uk";
		const currentPrice = await sut.registrationCost();

		const event = sut.LogNewDomain();
		const promiEvent = watchEvent(event);
		events.push(event);
		// Act
		await sut.registerDomain(domainName, ip, topLevelDomain, { from: anotherAccount, value: currentPrice });
		const result = await promiEvent;
		// Assert
		assert.equal(web3.toUtf8(result.args.domainName), domainName, "Wrong domainName value.");
		assert.equal(web3.toUtf8(result.args.ipAddress), ip, "Wrong ipAddress value.");
		assert.equal(result.args.domainOwner, anotherAccount, "Wrong domainOwner value.");
		assert.equal(web3.toUtf8(result.args.topLevelDomain), topLevelDomain, "Wrong topLevelDomain value.");
	});

	it("registerDomain Should raise LogReceipt event when successfully registering a domain", async () => {
		// Arrange
		const domainName = "notshortanymore";
		const ip = "127.0.0.1";
		const topLevelDomain = "co.uk";
		const currentPrice = await sut.registrationCost();

		const event = sut.LogReceipt();
		const promiEvent = watchEvent(event);
		events.push(event);
		// Act
		const initialTransaction = await sut.registerDomain(domainName, ip, topLevelDomain, { from: owner, value: currentPrice });
		const result = await promiEvent;

		const now = web3.eth.getBlock(initialTransaction.receipt.blockNumber).timestamp;
		// Assert
		assert.equal(result.args.receiver, owner, "Wrong receiver value.");
		assert.equal(web3.toUtf8(result.args.domainName), domainName, "Wrong domainName value.");
		assert.deepEqual(result.args.amountPaid, currentPrice, "Wrong ipAddress value.");
		assert.equal(result.args.timeBought, now, "Wrong timeBought value.");
	});

	it("registerDomain Should register regular-named domain on a regular price", async () => {
		// Arrange
		const domainName = "notshortanymore";
		const ip = "127.0.0.1";
		const topLevelDomain = "co.uk";
		const currentPrice = await sut.registrationCost();
		// Act
		const initialTransaction = await sut.registerDomain(domainName, ip, topLevelDomain, { from: anotherAccount, value: currentPrice });

		const domainKey = await sut.getDomainKey(domainName, topLevelDomain);
		const result = await sut.domains(domainKey);

		const expiryPeriod = await sut.expiryPeriod();
		const now = web3.eth.getBlock(initialTransaction.receipt.blockNumber).timestamp;
		const expectedValidUntil = expiryPeriod.add(now);
		// Assert
		assert.ok(result, "No domain with such name was found.");
		assert.equal(web3.toUtf8(result[0]), domainName, "Wrong domainName value.");
		assert.equal(web3.toUtf8(result[1]), ip, "Wrong ipAddress value.");
		assert.deepEqual(result[2], expectedValidUntil, "Wrong validUntil value.");
		assert.equal(result[3], anotherAccount, "Wrong domainOwner value.");
		assert.equal(web3.toUtf8(result[4]), topLevelDomain, "Wrong topLevelDomain value.");
	});

	it("registerDomain Should register short-named domains on a higher price", async () => {
		// Arrange
		const domainName = "shortname";
		const ip = "127.0.0.1";
		const topLevelDomain = "co.uk";
		let currentPrice = await sut.registrationCost();
		currentPrice = currentPrice.plus(currentPrice.div(10));
		// Act
		const initialTransaction = await sut.registerDomain(domainName, ip, topLevelDomain, { from: anotherAccount, value: currentPrice });

		const domainKey = await sut.getDomainKey(domainName, topLevelDomain);
		const result = await sut.domains(domainKey);

		const expiryPeriod = await sut.expiryPeriod();
		const now = web3.eth.getBlock(initialTransaction.receipt.blockNumber).timestamp;
		const expectedValidUntil = expiryPeriod.add(now);
		// Assert
		assert.ok(result, "No domain with such name was found.");
		assert.equal(web3.toUtf8(result[0]), domainName, "Wrong domainName value.");
		assert.equal(web3.toUtf8(result[1]), ip, "Wrong ipAddress value.");
		assert.deepEqual(result[2], expectedValidUntil, "Wrong validUntil value.");
		assert.equal(result[3], anotherAccount, "Wrong domainOwner value.");
		assert.equal(web3.toUtf8(result[4]), topLevelDomain, "Wrong topLevelDomain value.");
	});

	it("registerDomain Should throw when trying to register short-named domain on a regular price", async () => {
		// Arrange
		const domainName = "shortname";
		const ip = "127.0.0.1";
		const topLevelDomain = "co.uk";
		const currentPrice = await sut.registrationCost();
		// Act
		const result = sut.registerDomain(domainName, ip, topLevelDomain, { from: anotherAccount, value: currentPrice });
		// Assert
		await assertRevert(result);
	});

	it("registerDomain Should register existing, but expired domain, to another owner", async () => {
		// Arrange
		const domainName = "notshortanymore";
		const ip = "127.0.0.1";
		const topLevelDomain = "co.uk";
		const currentPrice = await sut.registrationCost();
		// Act
		await sut.registerDomain(domainName, ip, topLevelDomain, { from: owner, value: currentPrice });

		await increaseTime(constants.year + 1);

		await sut.registerDomain(domainName, ip, topLevelDomain, { from: anotherAccount, value: currentPrice });

		const domainKey = await sut.getDomainKey(domainName, topLevelDomain);
		const result = await sut.domains(domainKey);

		// Assert
		assert.ok(result, "No domain with such name was found.");
		assert.equal(result[3], anotherAccount, "Wrong domainOwner value.");
	});

	it("registerDomain Should issue receipt when passed valid arguments", async () => {
		// Arrange
		const domainName = "notshortanymore";
		const ip = "127.0.0.1";
		const topLevelDomain = "co.uk";
		const currentPrice = await sut.registrationCost();
		// Act
		const initialTransaction = await sut.registerDomain(domainName, ip, topLevelDomain, { from: owner, value: currentPrice });

		const now = web3.eth.getBlock(initialTransaction.receipt.blockNumber).timestamp;

		const result = await sut.receipts(owner, 0);
		// Assert
		assert.ok(result, "No receipts found for the given user address");
		assert.equal(web3.toUtf8(result[0]), domainName, "Wrong domainName value");
		assert.equal(result[1].toString(10), currentPrice, "Wrong amountPaid value");
		assert.equal(result[2].toString(10), now, "Wrong timeBought value");
	});

	it("renewDomainRegistration Should throw when the sent funds are insufficient", async () => {
		// Arrange
		const domainName = "notshortanymore";
		const ip = "127.0.0.1";
		const topLevelDomain = "co.uk";
		const currentPrice = await sut.registrationCost();
		await sut.registerDomain(domainName, ip, topLevelDomain, { from: anotherAccount, value: currentPrice });
		// Act
		const result = sut.renewDomainRegistration(domainName, topLevelDomain, { from: anotherAccount, value: currentPrice.minus(1) });
		// Assert
		await assertRevert(result);
	});

	it("renewDomainRegistration Should throw when the invoker is not the domain owner", async () => {
		// Arrange
		const domainName = "notshortanymore";
		const ip = "127.0.0.1";
		const topLevelDomain = "co.uk";
		const currentPrice = await sut.registrationCost();
		await sut.registerDomain(domainName, ip, topLevelDomain, { from: owner, value: currentPrice });
		// Act
		const result = sut.renewDomainRegistration(domainName, topLevelDomain, { from: anotherAccount, value: currentPrice });
		// Assert
		await assertRevert(result);
	});

	it("renewDomainRegistration Should renew the domain registration when the passed arguments are valid", async () => {
		// Arrange
		const domainName = "notshortanymore";
		const ip = "127.0.0.1";
		const topLevelDomain = "co.uk";
		const currentPrice = await sut.registrationCost();
		const initialTransaction = await sut.registerDomain(domainName, ip, topLevelDomain, { from: owner, value: currentPrice });
		// Act
		await sut.renewDomainRegistration(domainName, topLevelDomain, { from: owner, value: currentPrice });

		const domainKey = await sut.getDomainKey(domainName, topLevelDomain);
		const domainDetails = await sut.domains(domainKey);

		const expiryPeriod = await sut.expiryPeriod();
		const now = web3.eth.getBlock(initialTransaction.receipt.blockNumber).timestamp;
		const expectedValidUntil = expiryPeriod.add(expiryPeriod).add(now);
		// Assert
		assert.ok(domainDetails, "No domain with such name was found.");
		assert.deepEqual(domainDetails[2], expectedValidUntil, "Wrong validUntil value.");
	});

	it("renewDomainRegistration Should raise LogRegistrationRenewed event when called with valid arguments", async () => {
		// Arrange
		const domainName = "notshortanymore";
		const ip = "127.0.0.1";
		const topLevelDomain = "co.uk";
		const currentPrice = await sut.registrationCost();

		const event = sut.LogRegistrationRenewed();
		const promiEvent = watchEvent(event);
		events.push(event);
		const initialTransaction = await sut.registerDomain(domainName, ip, topLevelDomain, { from: owner, value: currentPrice });
		// Act
		await sut.renewDomainRegistration(domainName, topLevelDomain, { from: owner, value: currentPrice });
		const result = await promiEvent;

		const expiryPeriod = await sut.expiryPeriod();
		const now = web3.eth.getBlock(initialTransaction.receipt.blockNumber).timestamp;
		const expectedValidUntil = expiryPeriod.add(expiryPeriod).add(now);
		// Assert
		assert.equal(web3.toUtf8(result.args.domainName), domainName, "Wrong domainName value.");
		assert.equal(web3.toUtf8(result.args.ipAddress), ip, "Wrong ipAddress value.");
		assert.deepEqual(result.args.validUntil, expectedValidUntil, "Wrong validUntil value.");
		assert.equal(result.args.domainOwner, owner, "Wrong domainOwner value.");
		assert.equal(web3.toUtf8(result.args.topLevelDomain), topLevelDomain, "Wrong topLevelDomain value.");
	});

	it("renewDomainRegistration Should issue receipt when passed valid arguments", async () => {
		// Arrange
		const domainName = "notshortanymore";
		const ip = "127.0.0.1";
		const topLevelDomain = "co.uk";
		const currentPrice = await sut.registrationCost();
		await sut.registerDomain(domainName, ip, topLevelDomain, { from: owner, value: currentPrice });
		// Act
		const currentTransaction = await sut.renewDomainRegistration(domainName, topLevelDomain, { from: owner, value: currentPrice });

		const now = web3.eth.getBlock(currentTransaction.receipt.blockNumber).timestamp;

		const result = await sut.receipts(owner, 1);
		// Assert
		assert.ok(result, "No receipts found for the given user address");
		assert.equal(web3.toUtf8(result[0]), domainName, "Wrong domainName value");
		assert.equal(result[1].toString(10), currentPrice, "Wrong amountPaid value");
		assert.equal(result[2].toString(10), now, "Wrong timeBought value");
	});

	it("editDomainIp Should throw when the invoker is not the domain owner", async () => {
		// Arrange
		const domainName = "notshortanymore";
		const ip = "127.0.0.1";
		const topLevelDomain = "co.uk";
		const currentPrice = await sut.registrationCost();
		await sut.registerDomain(domainName, ip, topLevelDomain, { from: owner, value: currentPrice });
		// Act
		const anotherIp = "localhost";
		const result = sut.editDomainIp(domainName, topLevelDomain, anotherIp, { from: anotherAccount });
		// Assert
		assertRevert(result);
	});

	it("editDomainIp Should throw when the passed ip address is shorter than or equal to IP_ADDRESS_MIN_LENGTH", async () => {
		// Arrange
		const domainName = "notshortanymore";
		const ip = "127.0.0.1";
		const topLevelDomain = "co.uk";
		const currentPrice = await sut.registrationCost();
		await sut.registerDomain(domainName, ip, topLevelDomain, { from: owner, value: currentPrice });
		// Act
		const shortIp = "0.0.1";
		const result = sut.editDomainIp(domainName, topLevelDomain, shortIp, { from: owner });
		// Assert
		assertRevert(result);
	});

	it("editDomainIp Should edit the domain ip", async () => {
		// Arrange
		const domainName = "notshortanymore";
		const ip = "127.0.0.1";
		const topLevelDomain = "co.uk";
		const currentPrice = await sut.registrationCost();
		await sut.registerDomain(domainName, ip, topLevelDomain, { from: owner, value: currentPrice });
		// Act
		const anotherIp = "localhost";
		await sut.editDomainIp(domainName, topLevelDomain, anotherIp, { from: owner });

		const domainKey = await sut.getDomainKey(domainName, topLevelDomain);
		const domainDetails = await sut.domains(domainKey);
		// Assert
		assert.equal(web3.toUtf8(domainDetails[1]), anotherIp);
	});

	it("editDomainIp Should raise LogEditedDomain event when called with valid arguments", async () => {
		// Arrange
		const domainName = "notshortanymore";
		const ip = "127.0.0.1";
		const topLevelDomain = "co.uk";
		const currentPrice = await sut.registrationCost();

		const event = sut.LogEditedDomain();
		const promiEvent = watchEvent(event);
		events.push(event);
		// Act
		await sut.registerDomain(domainName, ip, topLevelDomain, { from: owner, value: currentPrice });
		const anotherIp = "localhost";
		await sut.editDomainIp(domainName, topLevelDomain, anotherIp, { from: owner });
		const result = await promiEvent;
		// Assert
		assert.equal(web3.toUtf8(result.args.domainName), domainName, "Wrong domainName value.");
		assert.equal(web3.toUtf8(result.args.topLevelDomain), topLevelDomain, "Wrong topLevelDomain value.");
		assert.equal(web3.toUtf8(result.args.newIpAddress), anotherIp, "Wrong newIpAddress value.");
	});

	it("transferOwnership Should throw when the invoker is not the domain owner", async () => {
		// Arrange
		const domainName = "notshortanymore";
		const ip = "127.0.0.1";
		const topLevelDomain = "co.uk";
		const currentPrice = await sut.registrationCost();
		await sut.registerDomain(domainName, ip, topLevelDomain, { from: owner, value: currentPrice });
		// Act
		const result = sut.transferOwnership(domainName, topLevelDomain, anotherAccount, { from: anotherAccount });
		// Assert
		assertRevert(result);
	});

	it("transferOwnership Should throw when passed invalid _to argument", async () => {
		// Arrange
		const domainName = "notshortanymore";
		const ip = "127.0.0.1";
		const topLevelDomain = "co.uk";
		const currentPrice = await sut.registrationCost();
		await sut.registerDomain(domainName, ip, topLevelDomain, { from: owner, value: currentPrice });
		// Act
		const result = sut.transferOwnership(domainName, topLevelDomain, '0x00', { from: owner });
		// Assert
		assertRevert(result);
	});

	it("transferOwnership Should transfer the ownership when called with valid arguments", async () => {
		// Arrange
		const domainName = "notshortanymore";
		const ip = "127.0.0.1";
		const topLevelDomain = "co.uk";
		const currentPrice = await sut.registrationCost();
		await sut.registerDomain(domainName, ip, topLevelDomain, { from: owner, value: currentPrice });
		// Act
		await sut.transferOwnership(domainName, topLevelDomain, anotherAccount, { from: owner });
		const domainKey = await sut.getDomainKey(domainName, topLevelDomain);
		const domainDetails = await sut.domains(domainKey);
		// Assert
		assert.equal(domainDetails[3], anotherAccount);
	});

	it("transferOwnership Should raise LogOwnershipTransfer event when called with valid arguments", async () => {
		// Arrange
		const domainName = "notshortanymore";
		const ip = "127.0.0.1";
		const topLevelDomain = "co.uk";
		const currentPrice = await sut.registrationCost();

		await sut.registerDomain(domainName, ip, topLevelDomain, { from: owner, value: currentPrice });

		const event = sut.LogOwnershipTransfer();
		const promiEvent = watchEvent(event);
		events.push(event);
		// Act
		await sut.transferOwnership(domainName, topLevelDomain, anotherAccount, { from: owner });
		const result = await promiEvent;
		// Assert
		assert.equal(web3.toUtf8(result.args.domainName), domainName, "Wrong domainName value.");
		assert.equal(web3.toUtf8(result.args.topLevelDomain), topLevelDomain, "Wrong topLevelDomain value.");
		assert.equal(result.args.from, owner, "Wrong sender address value.");
		assert.equal(result.args.to, anotherAccount, "Wrong receiver address value.");
	});
})