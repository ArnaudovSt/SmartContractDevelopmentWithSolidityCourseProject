import { Component, OnInit } from '@angular/core';
import { ContractService } from '../../services/contract.service';

@Component({
	selector: 'app-owner',
	templateUrl: './owner.component.html',
	styleUrls: ['./owner.component.css']
})
export class OwnerComponent implements OnInit {
	contractInfo = {
		wallet: '',
		owner: ''
	};

	newRegistrationCost = '';

	newExpiryPeriod = '';

	newWallet = '';

	withdrawAmount = '';

	newOwner = '';

	recipient = '';

	isContractDestroyed = false;

	constructor(private contractService: ContractService) { }

	ngOnInit() {
		this._getContractInfo();
	}

	public async changeRegistrationCost() {
		await this.contractService.changeRegistrationCost(this.newRegistrationCost);
		this.newRegistrationCost = '';
	}

	public async changeExpiryPeriod() {
		await this.contractService.changeExpiryPeriodInDays(this.newExpiryPeriod);
		this.newExpiryPeriod = '';
	}

	public async changeWallet() {
		await this.contractService.changeWallet(this.newWallet);
		this.newWallet = '';
		await this._getContractInfo();
	}

	public async withdrawEthers() {
		await this.contractService.withdrawEthers(this.withdrawAmount);
		this.withdrawAmount = '';
	}

	public async setNewOwner() {
		await this.contractService.setOwner(this.newOwner);
		this.newOwner = '';
		await this._getContractInfo();
	}

	public async destroy() {
		await this.contractService.destroy();
		await this._getContractInfo();
	}

	public async destroyAndSend() {
		await this.contractService.destroyAndSend(this.recipient);
		this.recipient = '';
		await this._getContractInfo();
	}

	private async _getContractInfo() {
		const oldWallet = this.contractInfo.wallet;
		const oldOwner = this.contractInfo.owner;
		this.contractInfo.wallet = await this.contractService.getWallet();
		this.contractInfo.owner = await this.contractService.getOwner();
		if (Number(this.contractInfo.owner) === 0) {
			this.isContractDestroyed = true;
			return;
		}
		if (oldWallet === this.contractInfo.wallet && oldOwner === this.contractInfo.owner) {
			const delay = new Promise(resolve => setTimeout(resolve, 500));
			await delay;
			await this._getContractInfo();
		}
	}
}
