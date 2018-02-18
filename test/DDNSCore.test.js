const DDNSCore = artifacts.require('../contracts/DDNSCore.sol')

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
		// Assert
	});

	it("DOMAIN_NAME_MIN_LENGTH constant Should have exact value", async () => {
		// Arrange
		// Act
		// Assert
	});

	it("PRICE_INCREASE_BOUND_INDEX constant Should have exact value", async () => {
		// Arrange
		// Act
		// Assert
	});

	it("registerDomain Should throw when domain name is shorter than DOMAIN_NAME_MIN_LENGTH", async () => {
		// Arrange
		// Act
		// Assert
	});

	it("registerDomain Should throw when the sent funds are insufficient", async () => {
		// Arrange
		// Act
		// Assert
	});

	it("registerDomain Should throw when domain with such name is registered and still valid", async () => {
		// Arrange
		// Act
		// Assert
	});

	it("registerDomain Should raise LogNewDomain event when domain with such name has not been registered before", async () => {
		// Arrange
		// Act
		// Assert
	});

	it("registerDomain Should register regular-named domains on a regular price", async () => {
		// Arrange
		// Act
		// Assert
	});

	it("registerDomain Should register short-named domains on a specific higher price", async () => {
		// Arrange
		// Act
		// Assert
	});

	it("renewDomainRegistration Should throw when the sent funds are insufficient", async () => {
		// Arrange
		// Act
		// Assert
	});

	it("renewDomainRegistration Should throw when the invoker is not the domain owner", async () => {
		// Arrange
		// Act
		// Assert
	});

	it("renewDomainRegistration Should renew the domain registration when the passed arguments are valid", async () => {
		// Arrange
		// Act
		// Assert
	});

	it("renewDomainRegistration Should raise LogRegistrationRenewed event when called with valid arguments", async () => {
		// Arrange
		// Act
		// Assert
	});

	it("editDomainIp Should throw when the invoker is not the domain owner", async () => {
		// Arrange
		// Act
		// Assert
	});

	it("editDomainIp Should edit the domain ip", async () => {
		// Arrange
		// Act
		// Assert
	});

	it("editDomainIp Should raise LogEditedDomain event when called with valid arguments", async () => {
		// Arrange
		// Act
		// Assert
	});

	it("transferOwnership Should throw when the invoker is not the domain owner", async () => {
		// Arrange
		// Act
		// Assert
	});

	it("transferOwnership Should throw when passed invalid arguments", async () => {
		// Arrange
		// Act
		// Assert
	});

	it("transferOwnership Should transfer the ownership when called with valid arguments", async () => {
		// Arrange
		// Act
		// Assert
	});

	it("transferOwnership Should raise LogOwnershipTransfer event when called with valid arguments", async () => {
		// Arrange
		// Act
		// Assert
	});
})