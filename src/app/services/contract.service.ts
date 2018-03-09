import { Injectable } from '@angular/core';
import { Web3Service } from './web3.service';
import { Contract, TransactionReceipt } from 'web3/types';
import { ToastrService } from 'ngx-toastr';
import * as contract_artifacts from '../../../build/contracts/DDNSCore.json';

@Injectable()
export class ContractService {
	private DDNSCore: Contract;

	constructor(private web3Service: Web3Service, private toastr: ToastrService) { }

	public async registerDomain(domainName: string, ipAddress: string, topLevelDomain: string
	) {
		await this._checkContract();

		if (!this._isValidDomain(domainName, topLevelDomain)) {
			this.toastr.error('The whole domain name is not correct! Please try again!');
			return;
		}

		if (!this._isValidIp(ipAddress)) {
			this.toastr.error('The ip address is not correct! Please try again!');
			return;
		}

		const domainPrice = await this._getDomainPrice(domainName);

		const from = await this.web3Service.getFromAccount();

		return this.DDNSCore.methods
			.registerDomain(this.web3Service.fromUtf8(domainName), this.web3Service.fromUtf8(ipAddress), this.web3Service.fromUtf8(topLevelDomain))
			.send({ from: from, value: domainPrice })
			.on('transactionHash', (hash: string) => {
				this.toastr.info(`${domainName}.${topLevelDomain} registration transaction hash is ${hash}.`);
			})
			.on('receipt', (receipt: TransactionReceipt) => {
				this.toastr.success(`Successfully registered ${domainName}.${topLevelDomain} at ${ipAddress}!`, `Transaction ${receipt.transactionHash} was mined.`);
			})
			.on('error', (err: string) => {
				this.toastr.error(`Could not register ${domainName}.${topLevelDomain} at ${ipAddress} due to revert!`);
				console.error(err);
			});
	}

	public async renewDomainRegistration(domainName: string, topLevelDomain: string) {
		await this._checkContract();

		const domainOwner = await this._getDomainOwner(domainName, topLevelDomain);

		const from = await this.web3Service.getFromAccount();

		if (domainOwner !== from) {
			this.toastr.error(`You must be the owner of ${domainName}.${topLevelDomain} in order to renew the domain registration!`);
			return;
		}

		const domainPrice = await this._getDomainPrice(domainName);

		return this.DDNSCore.methods
			.renewDomainRegistration(this.web3Service.fromUtf8(domainName), this.web3Service.fromUtf8(topLevelDomain))
			.send({ from: from, value: domainPrice })
			.on('transactionHash', (hash: string) => {
				this.toastr.info(`${domainName}.${topLevelDomain} renew transaction hash is ${hash}.`);
			})
			.on('receipt', (receipt: TransactionReceipt) => {
				this.toastr.success(`Successfully registered ${domainName}.${topLevelDomain}!`, `Transaction ${receipt.transactionHash} was mined.`);
			})
			.on('error', (err: string) => {
				this.toastr.error(`Could not renew ${domainName}.${topLevelDomain} due to revert!`);
				console.error(err);
			});
	}

	public async editDomainIp(domainName: string, topLevelDomain: string, newIpAddress: string) {
		await this._checkContract();

		if (!this._isValidIp(newIpAddress)) {
			this.toastr.error('The ip address is not correct! Please try again!');
			return;
		}

		const domainOwner = await this._getDomainOwner(domainName, topLevelDomain);

		const from = await this.web3Service.getFromAccount();

		if (domainOwner !== from) {
			this.toastr.error(`You must be the owner of ${domainName}.${topLevelDomain} in order to edit the domain ip!`);
			return;
		}

		return this.DDNSCore.methods
			.editDomainIp(this.web3Service.fromUtf8(domainName), this.web3Service.fromUtf8(topLevelDomain), this.web3Service.fromUtf8(newIpAddress))
			.send({ from: from })
			.on('transactionHash', (hash: string) => {
				this.toastr.info(`${domainName}.${topLevelDomain} edit ip transaction hash is ${hash}.`);
			})
			.on('receipt', (receipt: TransactionReceipt) => {
				this.toastr.success(`Successfully edited ${domainName}.${topLevelDomain} ip! The new ip is ${newIpAddress}.`, `Transaction ${receipt.transactionHash} was mined.`);
			})
			.on('error', (err: string) => {
				this.toastr.error(`Could not edit ${domainName}.${topLevelDomain}'s ip due to revert!`);
				console.error(err);
			});
	}

	public async transferOwnership(domainName: string, topLevelDomain: string, newOwnerAddress: string) {
		await this._checkContract();

		const checksumAddress = this.web3Service.getChecksumAddress(newOwnerAddress);
		if (!this.web3Service.isValidAddress(checksumAddress)) {
			this.toastr.error('The provided new owner address is not valid! Please try again!');
			return;
		}

		const domainOwner = await this._getDomainOwner(domainName, topLevelDomain);

		const from = await this.web3Service.getFromAccount();

		if (domainOwner !== from) {
			this.toastr.error(`You must be the owner of ${domainName}.${topLevelDomain} in order to transfer the domain ownership!`);
			return;
		}

		return this.DDNSCore.methods
			.transferOwnership(this.web3Service.fromUtf8(domainName), this.web3Service.fromUtf8(topLevelDomain), checksumAddress)
			.send({ from: from })
			.on('transactionHash', (hash: string) => {
				this.toastr.info(`${domainName}.${topLevelDomain} ownership transfer transaction hash is ${hash}.`);
			})
			.on('receipt', (receipt: TransactionReceipt) => {
				this.toastr.success(`Successfully transferred ${domainName}.${topLevelDomain} ownership! The new ip is ${checksumAddress}.`, `Transaction ${receipt.transactionHash} was mined.`);
			})
			.on('error', (err: string) => {
				this.toastr.error(`Could not transfer ${domainName}.${topLevelDomain} ownership due to revert!`);
				console.error(err);
			});
	}

	public async getOwnerReceipts(address: string) {
		await this._checkContract();

		const checksumAddress = this.web3Service.getChecksumAddress(address);
		if (!this.web3Service.isValidAddress(checksumAddress)) {
			this.toastr.error('The provided owner address is not valid! Please try again!');
			return;
		}

		return this.DDNSCore.methods.receipts(checksumAddress).call();
	}

	public async getDomainDetails(domainName: string, topLevelDomain: string) {
		await this._checkContract();

		if (!this._isValidDomain(domainName, topLevelDomain)) {
			this.toastr.error('The whole domain name is not correct! Please try again!');
			return;
		}

		return this._getDomainDetails(domainName, topLevelDomain);
	}

	public async getDomainPriceInEther(domainName: string) {
		await this._checkContract();

		if (!this._isValidDomain(domainName)) {
			this.toastr.error(`The domain name ${domainName} is not correct! Please try again!`);
			return;
		}

		const domainPriceInWei = await this._getDomainPrice(domainName);
		return this.web3Service.fromWei(domainPriceInWei);
	}

	public async getRegistrationCost(): Promise<string> {
		await this._checkContract();

		const registrationCost = await this.DDNSCore.methods.registrationCost().call();
		return (this.web3Service.fromWei(registrationCost)).toString(10);
	}

	public async getExpiryPeriodInDays(): Promise<string> {
		await this._checkContract();

		const expiryPeriod = await this.DDNSCore.methods.expiryPeriod().call();
		return (expiryPeriod.div(86400)).toString(10); // 86400 seconds in 24h
	}

	public async getWallet() {
		await this._checkContract();

		return this.DDNSCore.methods.wallet().call();
	}

	public async changeRegistrationCost(newPrice: (number | string)) {
		await this._checkContract();

		if (Number(newPrice) <= 0) {
			this.toastr.error(`The price must be positive!`);
			return;
		}

		const from = await this.web3Service.getFromAccount();

		const isOwnerOperating = await this._isOwnerOperating(from);
		if (!isOwnerOperating) {
			this.toastr.error(`You must be the owner of the DDNS contract in order to change the registration cost!!`);
			return;
		}

		const priceInWei = this.web3Service.toWei(newPrice);

		return this.DDNSCore.methods
			.changeRegistrationCost(priceInWei)
			.send({ from: from })
			.on('transactionHash', (hash: string) => {
				this.toastr.info(`Registration cost change transaction hash is ${hash}.`);
			})
			.on('receipt', (receipt: TransactionReceipt) => {
				this.toastr.success(`Successfully changed registration cost! The new price is ${newPrice} ETH`, `Transaction ${receipt.transactionHash} was mined.`);
			})
			.on('error', (err: string) => {
				this.toastr.error(`Could not change registration cost to ${newPrice} due to revert!`);
				console.error(err);
			});
	}

	public async changeExpiryPeriodInDays(newPeriod: (number | string)) {
		await this._checkContract();

		newPeriod = Number(newPeriod);
		if (newPeriod <= 7) {
			this.toastr.error(`The period must be greater than 7 days!`);
			return;
		}

		const from = await this.web3Service.getFromAccount();

		const isOwnerOperating = await this._isOwnerOperating(from);
		if (!isOwnerOperating) {
			this.toastr.error(`You must be the owner of the DDNS contract in order to change the expiry period!!`);
			return;
		}

		const periodInSeconds = newPeriod * 86400;

		return this.DDNSCore.methods
			.changeExpiryPeriod(periodInSeconds)
			.send({ from: from })
			.on('transactionHash', (hash: string) => {
				this.toastr.info(`Expiry period change transaction hash is ${hash}.`);
			})
			.on('receipt', (receipt: TransactionReceipt) => {
				this.toastr.success(`Successfully changed expiry period! The new expiry period is ${newPeriod} days`, `Transaction ${receipt.transactionHash} was mined.`);
			})
			.on('error', (err: string) => {
				this.toastr.error(`Could not change expiry period to ${newPeriod} due to revert!`);
				console.error(err);
			});
	}

	public async changeWallet(newWalletAddress) {
		await this._checkContract();

		const checksumAddress = this.web3Service.getChecksumAddress(newWalletAddress);
		if (!this.web3Service.isValidAddress(checksumAddress)) {
			this.toastr.error('The provided new wallet address is not valid! Please try again!');
			return;
		}

		const from = await this.web3Service.getFromAccount();

		const isOwnerOperating = await this._isOwnerOperating(from);
		if (!isOwnerOperating) {
			this.toastr.error(`You must be the owner of the DDNS contract in order to change the wallet address!!`);
			return;
		}

		return this.DDNSCore.methods
			.changeWallet(checksumAddress)
			.send({ from: from })
			.on('transactionHash', (hash: string) => {
				this.toastr.info(`Wallet change transaction hash is ${hash}.`);
			})
			.on('receipt', (receipt: TransactionReceipt) => {
				this.toastr.success(`Successfully changed wallet! The new wallet address is ${checksumAddress}.`, `Transaction ${receipt.transactionHash} was mined.`);
			})
			.on('error', (err: string) => {
				this.toastr.error(`Could not change wallet to ${checksumAddress} due to revert!`);
				console.error(err);
			});
	}

	public async withdrawEthers(amount: (string | number)) {
		await this._checkContract();

		const from = await this.web3Service.getFromAccount();

		const isOwnerOperating = await this._isOwnerOperating(from);
		if (!isOwnerOperating) {
			this.toastr.error(`You must be the owner of the DDNS contract in order to withdraw funds!!`);
			return;
		}

		const amountInWei = this.web3Service.toWei(amount);

		return this.DDNSCore.methods
			.withdraw(amountInWei)
			.send({ from: from })
			.on('transactionHash', (hash: string) => {
				this.toastr.info(`Withdraw transaction hash is ${hash}.`);
			})
			.on('receipt', (receipt: TransactionReceipt) => {
				this.toastr.success(`Successfully withdrew ${amount} ETH!`, `Transaction ${receipt.transactionHash} was mined.`);
			})
			.on('error', (err: string) => {
				this.toastr.error(`Could not withdraw ${amount} ETH due to revert!`);
				console.error(err);
			});
	}

	public async getOwner() {
		await this._checkContract();

		return this.DDNSCore.methods.owner().call();
	}

	public async setOwner(newOwner) {
		await this._checkContract();

		const checksumAddress = this.web3Service.getChecksumAddress(newOwner);
		if (!this.web3Service.isValidAddress(checksumAddress)) {
			this.toastr.error('The provided new owner address is not valid! Please try again!');
			return;
		}

		const from = await this.web3Service.getFromAccount();

		const isOwnerOperating = await this._isOwnerOperating(from);
		if (!isOwnerOperating) {
			this.toastr.error(`You must be the owner of the DDNS contract in order to set new owner!!`);
			return;
		}

		return this.DDNSCore.methods
			.setOwner(checksumAddress)
			.send({ from: from })
			.on('transactionHash', (hash: string) => {
				this.toastr.info(`Owner setting transaction hash is ${hash}.`);
			})
			.on('receipt', (receipt: TransactionReceipt) => {
				this.toastr.success(`Successfully set owner! The new owner address is ${checksumAddress}.`, `Transaction ${receipt.transactionHash} was mined.`);
			})
			.on('error', (err: string) => {
				this.toastr.error(`Could not set owner to ${checksumAddress} due to revert!`);
				console.error(err);
			});
	}

	public async destroy() {
		await this._checkContract();

		const from = await this.web3Service.getFromAccount();

		const isOwnerOperating = await this._isOwnerOperating(from);
		if (!isOwnerOperating) {
			this.toastr.error(`You must be the owner of the DDNS contract in order to destroy it!!`);
			return;
		}

		return this.DDNSCore.methods
			.destroy()
			.send({ from: from })
			.on('transactionHash', (hash: string) => {
				this.toastr.info(`Contract destroying transaction hash is ${hash}.`);
			})
			.on('receipt', (receipt: TransactionReceipt) => {
				this.toastr.success(`Successfully destroyed the contract!`, `Transaction ${receipt.transactionHash} was mined.`);
			})
			.on('error', (err: string) => {
				this.toastr.error(`Could not destroy contract due to revert!`);
				console.error(err);
			});
	}

	public async destroyAndSend(recipient) {
		await this._checkContract();

		const checksumAddress = this.web3Service.getChecksumAddress(recipient);
		if (!this.web3Service.isValidAddress(checksumAddress)) {
			this.toastr.error('The provided recipient address is not valid! Please try again!');
			return;
		}

		const from = await this.web3Service.getFromAccount();

		const isOwnerOperating = await this._isOwnerOperating(from);
		if (!isOwnerOperating) {
			this.toastr.error(`You must be the owner of the DDNS contract in order to destroy the contract and send it's funds!!`);
			return;
		}

		return this.DDNSCore.methods
			.destroyAndSend(checksumAddress)
			.send({ from: from })
			.on('transactionHash', (hash: string) => {
				this.toastr.info(`Contract destroying and fund sending transaction hash is ${hash}.`);
			})
			.on('receipt', (receipt: TransactionReceipt) => {
				this.toastr.success(`Successfully destroyed contract! All funds are sent to ${checksumAddress}.`, `Transaction ${receipt.transactionHash} was mined.`);
			})
			.on('error', (err: string) => {
				this.toastr.error(`Could not destroy contract and send funds to ${checksumAddress} due to revert!`);
				console.error(err);
			});
	}

	private async _initContract() {
		const ABI = contract_artifacts['abi'];
		const address = contract_artifacts['networks']['42'].address;
		this.DDNSCore = await this.web3Service.getContract(ABI, address);
	}

	private async _checkContract() {
		if (!this.DDNSCore) {
			await this._initContract();
		}
	}

	private _isValidDomain(domainName: string, topLevelDomain = 'com') {
		const pattern = /^(?:\w+:)?\/\/([^\s\.]+\.\S{2}|localhost[\:?\d]*)\S*$/;
		const matchesPattern = (`https://${domainName}.${topLevelDomain}`).match(pattern);
		const validDomainNameLength = domainName.length > 5;
		const validTopLevelDomainLength = topLevelDomain.length > 1;
		return (matchesPattern && validDomainNameLength && validTopLevelDomainLength);
	}

	private _isValidIp(ip: string) {
		const pattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
		const matchesPattern = ip.match(pattern);
		const validIpLength = ip.length > 6;
		return (matchesPattern && validIpLength);
	}

	private async _getDomainPrice(domainName: string) {
		return this.DDNSCore.methods.getDomainPrice(this.web3Service.fromUtf8(domainName)).call();
	}

	private async _getDomainKey(domainName: string, topLevelDomain: string) {
		return this.DDNSCore.methods.getDomainKey(this.web3Service.fromUtf8(domainName), this.web3Service.fromUtf8(topLevelDomain)).call();
	}

	private async _getDomainDetails(domainName: string, topLevelDomain: string) {
		const key = await this._getDomainKey(domainName, topLevelDomain);
		return this.DDNSCore.methods.domains(key).call();
	}

	private async _getDomainOwner(domainName: string, topLevelDomain: string) {
		return (await this._getDomainDetails(domainName, topLevelDomain))[3];
	}

	private async _isOwnerOperating(fromAccount) {
		const contractOwner = await this.getOwner();
		return contractOwner === fromAccount;
	}
}
