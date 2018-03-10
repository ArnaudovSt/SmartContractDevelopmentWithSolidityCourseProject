import { Component, OnInit } from '@angular/core';
import { ContractService } from '../../services/contract.service';
import { Web3Service } from '../../services/web3.service';

@Component({
	selector: 'app-receipts',
	templateUrl: './receipts.component.html',
	styleUrls: ['./receipts.component.css']
})
export class ReceiptsComponent implements OnInit {

	isContractDestroyed = false;

	report = {
		owner: '',
		receipts: []
	};

	constructor(private contractService: ContractService, private web3Service: Web3Service) { }

	ngOnInit() {
		this._checkContract();
		this._fillReportOwner();
	}

	public async getReceiptsReport() {
		this.report.receipts = [];
		let index = 0;
		while (true) {
			const currentReceipt = await this.contractService.getReceiptReport(this.report.owner, index);

			if (!currentReceipt) {
				break;
			}
			currentReceipt.domainName = this.web3Service.toUtf8(currentReceipt.domainName);
			currentReceipt.amountPaid = this.web3Service.fromWei(currentReceipt.amountPaid);
			currentReceipt.timeBought += '000';
			this.report.receipts.push(currentReceipt);
			index++;
		}
	}

	private async _checkContract() {
		const owner = await this.contractService.getOwner();
		if (Number(owner) === 0) {
			this.isContractDestroyed = true;
		}
	}

	private async _fillReportOwner() {
		this.report.owner = await this.web3Service.getFromAccount();
	}
}
