import { Component, OnInit } from '@angular/core';
import { ContractService } from '../../services/contract.service';
import { Web3Service } from '../../services/web3.service';

@Component({
	selector: 'app-home',
	templateUrl: './home.component.html',
	styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

	contractInfo = {
		wallet: '',
		owner: '',
		registrationCost: '',
		expiryPeriod: ''
	}

	isContractDestroyed = false;

	constructor(private contractService: ContractService, private web3Service: Web3Service) { }

	ngOnInit() {
		this._getContractInfo();
	}

	private async _getContractInfo() {
		this.contractInfo.wallet = await this.contractService.getWallet();
		this.contractInfo.owner = await this.contractService.getOwner();
		this.contractInfo.registrationCost = await this.contractService.getRegistrationCost();
		this.contractInfo.expiryPeriod = await this.contractService.getExpiryPeriodInDays();
		if (Number(this.contractInfo.owner) === 0) {
			this.isContractDestroyed = true;
			return;
		}
	}

}
