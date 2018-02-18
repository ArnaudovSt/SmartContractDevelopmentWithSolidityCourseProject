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

	it("PRICE_INCREASE_BOUND_INDEX constant Should have exact value", async () => {
		// Arrange
		// Act
		const result = await sut.PRICE_INCREASE_BOUND_INDEX();
		// Assert
		assert.equal(result, 9);
	});

	it("registerDomain Should throw when domain name is shorter than or equal to DOMAIN_NAME_MIN_LENGTH", async () => {
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
		let promiEvent = watchEvent(event);
		events.push(event);
		// Act
		await sut.registerDomain(domainName, ip, topLevelDomain, { from: anotherAccount, value: currentPrice });
		const result = await promiEvent;
		// Assert
		assert.equal(web3.toUtf8(result.args._domainName), domainName, "Wrong _domainName value.");
		assert.equal(web3.toUtf8(result.args._ipAddress), ip, "Wrong _ipAddress value.");
		assert.equal(result.args._domainOwner, anotherAccount, "Wrong _domainOwner value.");
		assert.equal(web3.toUtf8(result.args._topLevelDomain), topLevelDomain, "Wrong _topLevelDomain value.");
	});

	it("registerDomain Should register regular-named domain on a regular price", async () => {
		// Arrange
		const domainName = "notshortanymore";
		const ip = "127.0.0.1";
		const topLevelDomain = "co.uk";
		const currentPrice = await sut.registrationCost();
		// Act
		await sut.registerDomain(domainName, ip, topLevelDomain, { from: anotherAccount, value: currentPrice });

		const domainNameBytes = web3.fromUtf8(domainName);
		const result = await sut.domains(domainNameBytes);

		const expiryPeriod = await sut.expiryPeriod();
		const now = web3.eth.getBlock("latest").timestamp;
		const expectedValidUntil = expiryPeriod.add(now);
		// Assert
		assert.ok(result, "No domain with such name was found.");
		assert.equal(web3.toUtf8(result[0]), ip, "Wrong ipAddress value.");
		assert.deepEqual(result[1], expectedValidUntil, "Wrong validUntil value.");
		assert.equal(result[2], anotherAccount, "Wrong domainOwner value.");
		assert.equal(web3.toUtf8(result[3]), topLevelDomain, "Wrong topLevelDomain value.");
	});

	it("registerDomain Should register short-named domains on a higher price", async () => {
		// Arrange
		const domainName = "shortname";
		const ip = "127.0.0.1";
		const topLevelDomain = "co.uk";
		let currentPrice = await sut.registrationCost();
		currentPrice = currentPrice.plus(currentPrice.div(10));
		// Act
		await sut.registerDomain(domainName, ip, topLevelDomain, { from: anotherAccount, value: currentPrice });

		const domainNameBytes = web3.fromUtf8(domainName);
		const result = await sut.domains(domainNameBytes);

		const expiryPeriod = await sut.expiryPeriod();
		const now = web3.eth.getBlock("latest").timestamp;
		const expectedValidUntil = expiryPeriod.add(now);
		// Assert
		assert.ok(result, "No domain with such name was found.");
		assert.equal(web3.toUtf8(result[0]), ip, "Wrong ipAddress value.");
		assert.deepEqual(result[1], expectedValidUntil, "Wrong validUntil value.");
		assert.equal(result[2], anotherAccount, "Wrong domainOwner value.");
		assert.equal(web3.toUtf8(result[3]), topLevelDomain, "Wrong topLevelDomain value.");
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

		const domainNameBytes = web3.fromUtf8(domainName);
		const result = await sut.domains(domainNameBytes);

		// Assert
		assert.ok(result, "No domain with such name was found.");
		assert.equal(result[2], anotherAccount, "Wrong domainOwner value.");
	});

	it("renewDomainRegistration Should throw when the sent funds are insufficient", async () => {
		// Arrange
		const domainName = "notshortanymore";
		const ip = "127.0.0.1";
		const topLevelDomain = "co.uk";
		const currentPrice = await sut.registrationCost();
		await sut.registerDomain(domainName, ip, topLevelDomain, { from: anotherAccount, value: currentPrice });
		// Act
		const result = sut.renewDomainRegistration(domainName, { from: anotherAccount, value: currentPrice.minus(1) });
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
		const result = sut.renewDomainRegistration(domainName, { from: anotherAccount, value: currentPrice });
		// Assert
		await assertRevert(result);
	});

	it("renewDomainRegistration Should renew the domain registration when the passed arguments are valid", async () => {
		// Arrange
		const domainName = "notshortanymore";
		const ip = "127.0.0.1";
		const topLevelDomain = "co.uk";
		const currentPrice = await sut.registrationCost();
		await sut.registerDomain(domainName, ip, topLevelDomain, { from: owner, value: currentPrice });
		// Act
		await sut.renewDomainRegistration(domainName, { from: owner, value: currentPrice });

		const domainNameBytes = web3.fromUtf8(domainName);
		const domainDetails = await sut.domains(domainNameBytes);

		const expiryPeriod = await sut.expiryPeriod();
		const now = web3.eth.getBlock("latest").timestamp;
		const expectedValidUntil = expiryPeriod.add(expiryPeriod).add(now);
		// Assert
		assert.ok(domainDetails, "No domain with such name was found.");
		assert.deepEqual(domainDetails[1], expectedValidUntil, "Wrong validUntil value.");
	});

	it("renewDomainRegistration Should raise LogRegistrationRenewed event when called with valid arguments", async () => {
		// Arrange
		const domainName = "notshortanymore";
		const ip = "127.0.0.1";
		const topLevelDomain = "co.uk";
		const currentPrice = await sut.registrationCost();

		const event = sut.LogRegistrationRenewed();
		let promiEvent = watchEvent(event);
		events.push(event);
		// Act
		await sut.registerDomain(domainName, ip, topLevelDomain, { from: owner, value: currentPrice });
		await sut.renewDomainRegistration(domainName, { from: owner, value: currentPrice });
		const result = await promiEvent;

		const expiryPeriod = await sut.expiryPeriod();
		const now = web3.eth.getBlock("latest").timestamp;
		const expectedValidUntil = expiryPeriod.add(expiryPeriod).add(now);
		// Assert
		assert.equal(web3.toUtf8(result.args._domainName), domainName, "Wrong _domainName value.");
		assert.equal(web3.toUtf8(result.args._ipAddress), ip, "Wrong _ipAddress value.");
		assert.deepEqual(result.args._validUntil, expectedValidUntil, "Wrong validUntil value.");
		assert.equal(result.args._domainOwner, owner, "Wrong _domainOwner value.");
		assert.equal(web3.toUtf8(result.args._topLevelDomain), topLevelDomain, "Wrong _topLevelDomain value.");
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
		const result = sut.editDomainIp(domainName, anotherIp, { from: anotherAccount });
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
		await sut.editDomainIp(domainName, anotherIp, { from: owner });

		const domainNameBytes = web3.fromUtf8(domainName);
		const domainDetails = await sut.domains(domainNameBytes);
		// Assert
		assert.equal(web3.toUtf8(domainDetails[0]), anotherIp);
	});

	it("editDomainIp Should raise LogEditedDomain event when called with valid arguments", async () => {
		// Arrange
		const domainName = "notshortanymore";
		const ip = "127.0.0.1";
		const topLevelDomain = "co.uk";
		const currentPrice = await sut.registrationCost();

		const event = sut.LogEditedDomain();
		let promiEvent = watchEvent(event);
		events.push(event);
		// Act
		await sut.registerDomain(domainName, ip, topLevelDomain, { from: owner, value: currentPrice });
		const anotherIp = "localhost";
		await sut.editDomainIp(domainName, anotherIp, { from: owner });
		const result = await promiEvent;
		// Assert
		assert.equal(web3.toUtf8(result.args._domainName), domainName, "Wrong _domainName value.");
		assert.equal(web3.toUtf8(result.args._newIpAddress), anotherIp, "Wrong _newIpAddress value.");
	});

	it("transferOwnership Should throw when the invoker is not the domain owner", async () => {
		// Arrange
		const domainName = "notshortanymore";
		const ip = "127.0.0.1";
		const topLevelDomain = "co.uk";
		const currentPrice = await sut.registrationCost();
		await sut.registerDomain(domainName, ip, topLevelDomain, { from: owner, value: currentPrice });
		// Act
		const result = sut.transferOwnership(domainName, anotherAccount, { from: anotherAccount });
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
		const result = sut.transferOwnership(domainName, '0x00', { from: owner });
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
		await sut.transferOwnership(domainName, anotherAccount, { from: owner });
		const domainNameBytes = web3.fromUtf8(domainName);
		const domainDetails = await sut.domains(domainNameBytes);
		// Assert
		assert.equal(domainDetails[2], anotherAccount);
	});

	it("transferOwnership Should raise LogOwnershipTransfer event when called with valid arguments", async () => {
		// Arrange
		const domainName = "notshortanymore";
		const ip = "127.0.0.1";
		const topLevelDomain = "co.uk";
		const currentPrice = await sut.registrationCost();

		await sut.registerDomain(domainName, ip, topLevelDomain, { from: owner, value: currentPrice });

		const event = sut.LogOwnershipTransfer();
		let promiEvent = watchEvent(event);
		events.push(event);
		// Act
		await sut.transferOwnership(domainName, anotherAccount, { from: owner });
		const result = await promiEvent;
		// Assert
		assert.equal(web3.toUtf8(result.args._domainName), domainName, "Wrong _domainName value.");
		assert.equal(result.args._from, owner, "Wrong sender address value.");
		assert.equal(result.args._to, anotherAccount, "Wrong receiver address value.");
	});
})