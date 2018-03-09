import { Injectable } from '@angular/core';
import { Subject } from 'rxjs/Rx';
import { ToastrService } from 'ngx-toastr';
// import Web3 from 'web3'; /* https://github.com/ethereum/web3.js/issues/1155 */
const Web3 = require('web3');

declare let window: any;

@Injectable()
export class Web3Service {
	private web3: any;
	private accounts: string[];
	public accountsObservable = new Subject<string[]>();
	private readonly provider: string = 'http://localhost:8545';

	constructor(private toastr: ToastrService) {
		window.addEventListener('load', (event) => {
			this.bootstrapWeb3();
		});
	}

	public async getContract(ABI, address) {
		if (!this.web3) {
			this.bootstrapWeb3();
		}

		return new this.web3.eth.Contract(ABI, address);
	}

	public isValidAddress(address: string) {
		return this.web3.utils.isAddress(address);
	}

	public getChecksumAddress(address: string) {
		return this.web3.utils.toChecksumAddress(address);
	}

	public fromWei(amount: (number | string)) {
		return this.web3.utils.fromWei(amount, 'ether');
	}

	public toWei(amount: (number | string)) {
		return this.web3.utils.toWei(amount, 'ether');
	}

	public toUtf8(bytes) {
		return this.web3.utils.toUtf8(bytes);
	}

	private bootstrapWeb3() {
		// Checking if Web3 has been injected by the browser (Mist/MetaMask)
		if (typeof window.web3 !== 'undefined') {
			// Use Mist/MetaMask's provider
			this.web3 = new Web3(window.web3.currentProvider);
		} else {
			this.toastr.info('No web3? You should consider trying MetaMask!');

			// Hack to provide backwards compatibility for Truffle, which uses web3js 0.20.x
			Web3.providers.HttpProvider.prototype.sendAsync = Web3.providers.HttpProvider.prototype.send;
			// fallback - use your fallback strategy (local node / hosted node)
			this.web3 = new Web3(new Web3.providers.HttpProvider(this.provider));
		}

		setInterval(() => this.refreshAccounts(), 500);
	}

	private refreshAccounts() {
		this.web3.eth.getAccounts((err, accs) => {
			if (err != null) {
				this.toastr.warning('There was an error fetching your accounts.');
				return;
			}

			// Get the initial account balance so it can be displayed.
			if (accs.length === 0) {
				this.toastr.info('Couldn\'t get any accounts! Make sure your Ethereum client is configured correctly.');
				return;
			}

			if (!this.accounts || this.accounts.length !== accs.length || this.accounts[0] !== accs[0]) {
				this.toastr.success('Observed new accounts');

				this.accountsObservable.next(accs);
				this.accounts = accs;
			}
		});
	}
}
