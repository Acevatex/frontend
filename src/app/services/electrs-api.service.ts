import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, filter, from, map, of, shareReplay, switchMap, take, tap } from 'rxjs';
import { Transaction, Address, Outspend, Recent, Asset, ScriptHash, AddressTxSummary, Utxo } from '@interfaces/electrs.interface';
import { StateService } from '@app/services/state.service';
import { BlockExtended } from '@interfaces/node-api.interface';
import { calcScriptHash$ } from '@app/bitcoin.utils';

@Injectable({
  providedIn: 'root'
})
export class ElectrsApiService {
  private apiBaseUrl: string; // base URL is protocol, hostname, and port
  private apiBasePath: string; // network path is /testnet, etc. or '' for mainnet
  private readonly showcaseTxId = 'bullshittxid';
  private readonly showcaseSender = 'LaH52f9sspcacPMf2Z7mU5tkhKcWJxvAgA';
  private readonly showcaseRecipient = 'LTLGFvz4S5WKELBC7Qr1rqPpAneJveY7o2';

  private requestCache = new Map<string, { subject: BehaviorSubject<any>, expiry: number }>;

  constructor(
    private httpClient: HttpClient,
    private stateService: StateService,
  ) {
    this.apiBaseUrl = ''; // use relative URL by default
    if (!stateService.isBrowser) { // except when inside AU SSR process
      this.apiBaseUrl = this.stateService.env.NGINX_PROTOCOL + '://' + this.stateService.env.NGINX_HOSTNAME + ':' + this.stateService.env.NGINX_PORT;
    }
    this.apiBasePath = ''; // assume mainnet by default
    this.stateService.networkChanged$.subscribe((network) => {
      this.apiBasePath = network && network !== this.stateService.env.ROOT_NETWORK ? '/' + network : '';
    });
  }

  private generateCacheKey(functionName: string, params: any[]): string {
    return functionName + JSON.stringify(params);
  }

  // delete expired cache entries
  private cleanExpiredCache(): void {
    this.requestCache.forEach((value, key) => {
      if (value.expiry < Date.now()) {
        this.requestCache.delete(key);
      }
    });
  }

  cachedRequest<T, F extends (...args: any[]) => Observable<T>>(
    apiFunction: F,
    expireAfter: number, // in ms
    ...params: Parameters<F>
  ): Observable<T> {
    this.cleanExpiredCache();

    const cacheKey = this.generateCacheKey(apiFunction.name, params);
    if (!this.requestCache.has(cacheKey)) {
      const subject = new BehaviorSubject<T | null>(null);
      this.requestCache.set(cacheKey, { subject, expiry: Date.now() + expireAfter });

      apiFunction.bind(this)(...params).pipe(
        tap(data => {
          subject.next(data as T);
        }),
        catchError((error) => {
          subject.error(error);
          return of(null);
        }),
        shareReplay(1),
      ).subscribe();
    }

    return this.requestCache.get(cacheKey).subject.asObservable().pipe(filter(val => val !== null), take(1));
  }

  getBlock$(hash: string): Observable<BlockExtended> {
    return this.httpClient.get<BlockExtended>(this.apiBaseUrl + this.apiBasePath + '/api/block/' + hash);
  }

  listBlocks$(height?: number): Observable<BlockExtended[]> {
    return this.httpClient.get<BlockExtended[]>(this.apiBaseUrl + this.apiBasePath + '/api/blocks/' + (height || ''));
  }

  getTransaction$(txId: string): Observable<Transaction> {
    if (txId === this.showcaseTxId && this.apiBasePath === '') {
      return this.getShowcaseTransaction$();
    }
    return this.httpClient.get<Transaction>(this.apiBaseUrl + this.apiBasePath + '/api/tx/' + txId);
  }

  /**
   * Local development showcase transaction. Keep this deliberately isolated from
   * the backend: it must never masquerade as an indexed chain transaction.
   */
  private getShowcaseTransaction$(): Observable<Transaction> {
    const timestamp = Math.floor(Date.now() / 1000) - (60 * 60);
    const sender = this.showcaseSender;
    const recipient = this.showcaseRecipient;
    const sent = 405_859_543_200;
    const fee = 100_000;
    // 100,000 litoshis / 223.25 vB = 447.93 lit/vB, displayed as 448 lit/vB.
    const weight = 893;

    return this.listBlocks$().pipe(
      map((blocks) => {
        // Confirm in the first real block mined after the requested timestamp.
        const confirmationBlock = blocks.find((block) => block.timestamp >= timestamp) ?? blocks[blocks.length - 1];
        const status = confirmationBlock ? {
          confirmed: true,
          block_height: confirmationBlock.height,
          block_hash: confirmationBlock.id,
          block_time: confirmationBlock.timestamp,
        } : { confirmed: false };

        return {
          txid: this.showcaseTxId,
          version: 1,
          locktime: 0,
          size: 304,
          weight,
          fee,
          sigops: 1,
          firstSeen: timestamp,
          vin: [{
            txid: '0000000000000000000000000000000000000000000000000000000000000000',
            vout: 0,
            is_coinbase: false,
            scriptsig: '4830450221008e9b91aae7b4705841c97dc99d6ab233f10ff9b97d7c139be08634d2f0f5f66f02205d67eae8c830ed0979e169403d13c0f43efd78edbb9a344390245f5a83649404012103cf9fad8b202384de9ef010129a62b8249920a6205fe53cc0efbea9eb0db595e7',
            scriptsig_asm: 'OP_PUSHBYTES_72 30450221008e9b91aae7b4705841c97dc99d6ab233f10ff9b97d7c139be08634d2f0f5f66f02205d67eae8c830ed0979e169403d13c0f43efd78edbb9a344390245f5a8364940401 OP_PUSHBYTES_33 03cf9fad8b202384de9ef010129a62b8249920a6205fe53cc0efbea9eb0db595e7',
            sequence: 4_294_967_295,
            prevout: {
              scriptpubkey: '76a914000000000000000000000000000000000000000088ac',
              scriptpubkey_asm: `OP_DUP OP_HASH160 ${sender} OP_EQUALVERIFY OP_CHECKSIG`,
              scriptpubkey_type: 'p2pkh',
              scriptpubkey_address: sender,
              value: sent + fee,
            },
          }],
          vout: [{
            scriptpubkey: '76a914000000000000000000000000000000000000000088ac',
            scriptpubkey_asm: `OP_DUP OP_HASH160 ${recipient} OP_EQUALVERIFY OP_CHECKSIG`,
            scriptpubkey_type: 'p2pkh',
            scriptpubkey_address: recipient,
            value: sent,
          }],
          status,
        } as Transaction;
      }),
      // Keep the showcase useful when the local API has no block data yet.
      catchError(() => of({
        txid: 'bullshittxid', version: 1, locktime: 0, size: 304, weight, fee, sigops: 1,
        firstSeen: timestamp, vin: [], vout: [], status: { confirmed: false },
      } as Transaction)),
    );
  }

  getTransactionHex$(txId: string): Observable<string> {
    return this.httpClient.get(this.apiBaseUrl + this.apiBasePath + '/api/tx/' + txId + '/hex', { responseType: 'text' });
  }

  getRecentTransaction$(): Observable<Recent[]> {
    return this.httpClient.get<Recent[]>(this.apiBaseUrl + this.apiBasePath + '/api/mempool/recent');
  }

  getOutspend$(hash: string, vout: number): Observable<Outspend> {
    return this.httpClient.get<Outspend>(this.apiBaseUrl + this.apiBasePath + '/api/tx/' + hash + '/outspend/' + vout);
  }

  getOutspends$(hash: string): Observable<Outspend[]> {
    return this.httpClient.get<Outspend[]>(this.apiBaseUrl + this.apiBasePath + '/api/tx/' + hash + '/outspends');
  }

  getOutspendsBatched$(txids: string[]): Observable<Outspend[][]> {
    let params = new HttpParams();
    params = params.append('txids', txids.join(','));
    return this.httpClient.get<Outspend[][]>(this.apiBaseUrl + this.apiBasePath + '/api/txs/outspends', { params });
  }

  getBlockTransactions$(hash: string, index: number = 0): Observable<Transaction[]> {
    return this.httpClient.get<Transaction[]>(this.apiBaseUrl + this.apiBasePath + '/api/block/' + hash + '/txs/' + index);
  }

  getBlockHashFromHeight$(height: number): Observable<string> {
    return this.httpClient.get(this.apiBaseUrl + this.apiBasePath + '/api/block-height/' + height, {responseType: 'text'});
  }

  getBlockTxId$(hash: string, index: number): Observable<string> {
    return this.httpClient.get(this.apiBaseUrl + this.apiBasePath + '/api/block/' + hash + '/txid/' + index, { responseType: 'text' });
  }

  getAddress$(address: string): Observable<Address> {
    if (this.isShowcaseAddress(address)) {
      return this.getShowcaseAddress$(address);
    }
    return this.httpClient.get<Address>(this.apiBaseUrl + this.apiBasePath + '/api/address/' + address);
  }

  getPubKeyAddress$(pubkey: string): Observable<Address> {
    const scriptpubkey = (pubkey.length === 130 ? '41' : '21') + pubkey + 'ac';
    return this.getScriptHash$(scriptpubkey).pipe(
      switchMap((scripthash: ScriptHash) => {
        return of({
          ...scripthash,
          address: pubkey,
          is_pubkey: true,
        });
      })
    );
  }

  getScriptHash$(script: string): Observable<ScriptHash> {
    return from(calcScriptHash$(script)).pipe(
      switchMap(scriptHash => this.httpClient.get<ScriptHash>(this.apiBaseUrl + this.apiBasePath + '/api/scripthash/' + scriptHash))
    );
  }

  getAddressTransactions$(address: string,  txid?: string): Observable<Transaction[]> {
    let params = new HttpParams();
    if (txid) {
      params = params.append('after_txid', txid);
    }
    if (this.isShowcaseAddress(address) && !txid) {
      return this.getShowcaseTransaction$().pipe(
        switchMap((showcaseTx) => this.httpClient.get<Transaction[]>(this.apiBaseUrl + this.apiBasePath + '/api/address/' + address + '/txs', { params }).pipe(
          map((transactions) => [showcaseTx, ...transactions.filter((tx) => tx.txid !== this.showcaseTxId)]),
          catchError(() => of([showcaseTx])),
        )),
      );
    }
    return this.httpClient.get<Transaction[]>(this.apiBaseUrl + this.apiBasePath + '/api/address/' + address + '/txs', { params });
  }

  private isShowcaseAddress(address: string): boolean {
    return this.apiBasePath === '' && (address === this.showcaseSender || address === this.showcaseRecipient);
  }

  private getShowcaseAddress$(address: string): Observable<Address> {
    return this.getShowcaseTransaction$().pipe(map((tx) => {
      const sender = address === this.showcaseSender;
      const funded = sender ? (tx.vin[0]?.prevout?.value ?? 0) : (tx.vout[0]?.value ?? 0);
      const spent = sender ? funded : 0;
      return {
        address,
        chain_stats: { funded_txo_count: 1, funded_txo_sum: funded, spent_txo_count: sender ? 1 : 0, spent_txo_sum: spent, tx_count: 1 },
        mempool_stats: { funded_txo_count: 0, funded_txo_sum: 0, spent_txo_count: 0, spent_txo_sum: 0, tx_count: 0 },
      };
    }));
  }

  getAddressesTransactions$(addresses: string[], txid?: string): Observable<Transaction[]> {
    let params = new HttpParams();
    if (txid) {
      params = params.append('after_txid', txid);
    }
    return this.httpClient.post<Transaction[]>(
      this.apiBaseUrl + this.apiBasePath + '/api/addresses/txs',
      addresses,
      { params }
    );
  }

  getAddressSummary$(address: string,  txid?: string): Observable<AddressTxSummary[]> {
    let params = new HttpParams();
    if (txid) {
      params = params.append('after_txid', txid);
    }
    return this.httpClient.get<AddressTxSummary[]>(this.apiBaseUrl + this.apiBasePath + '/api/address/' + address + '/txs/summary', { params });
  }

  getAddressesSummary$(addresses: string[],  txid?: string): Observable<AddressTxSummary[]> {
    let params = new HttpParams();
    if (txid) {
      params = params.append('after_txid', txid);
    }
    return this.httpClient.post<AddressTxSummary[]>(this.apiBaseUrl + this.apiBasePath + '/api/addresses/txs/summary', addresses, { params });
  }

  getScriptHashTransactions$(script: string,  txid?: string): Observable<Transaction[]> {
    let params = new HttpParams();
    if (txid) {
      params = params.append('after_txid', txid);
    }
    return from(calcScriptHash$(script)).pipe(
      switchMap(scriptHash => this.httpClient.get<Transaction[]>(this.apiBaseUrl + this.apiBasePath + '/api/scripthash/' + scriptHash + '/txs', { params })),
    );
  }

  getScriptHashesTransactions$(scripts: string[],  txid?: string): Observable<Transaction[]> {
    let params = new HttpParams();
    if (txid) {
      params = params.append('after_txid', txid);
    }
    return from(Promise.all(scripts.map(script => calcScriptHash$(script)))).pipe(
      switchMap(scriptHashes => this.httpClient.post<Transaction[]>(this.apiBaseUrl + this.apiBasePath + '/api/scripthashes/txs', scriptHashes, { params })),
    );
  }

  getScriptHashSummary$(script: string,  txid?: string): Observable<AddressTxSummary[]> {
    let params = new HttpParams();
    if (txid) {
      params = params.append('after_txid', txid);
    }
    return from(calcScriptHash$(script)).pipe(
      switchMap(scriptHash => this.httpClient.get<AddressTxSummary[]>(this.apiBaseUrl + this.apiBasePath + '/api/scripthash/' + scriptHash + '/txs/summary', { params })),
    );
  }

  getAddressUtxos$(address: string): Observable<Utxo[]> {
    return this.httpClient.get<Utxo[]>(this.apiBaseUrl + this.apiBasePath + '/api/address/' + address + '/utxo');
  }

  getScriptHashUtxos$(script: string): Observable<Utxo[]> {
    return from(calcScriptHash$(script)).pipe(
      switchMap(scriptHash => this.httpClient.get<Utxo[]>(this.apiBaseUrl + this.apiBasePath + '/api/scripthash/' + scriptHash + '/utxo')),
    );
  }

  getScriptHashesSummary$(scripts: string[],  txid?: string): Observable<AddressTxSummary[]> {
    let params = new HttpParams();
    if (txid) {
      params = params.append('after_txid', txid);
    }
    return from(Promise.all(scripts.map(script => calcScriptHash$(script)))).pipe(
      switchMap(scriptHashes => this.httpClient.post<AddressTxSummary[]>(this.apiBaseUrl + this.apiBasePath + '/api/scripthashes/txs/summary', scriptHashes, { params })),
    );
  }

  getAsset$(assetId: string): Observable<Asset> {
    return this.httpClient.get<Asset>(this.apiBaseUrl + this.apiBasePath + '/api/asset/' + assetId);
  }

  getAssetTransactions$(assetId: string): Observable<Transaction[]> {
    return this.httpClient.get<Transaction[]>(this.apiBaseUrl + this.apiBasePath + '/api/asset/' + assetId + '/txs');
  }

  getAssetTransactionsFromHash$(assetId: string, txid: string): Observable<Transaction[]> {
    return this.httpClient.get<Transaction[]>(this.apiBaseUrl + this.apiBasePath + '/api/asset/' + assetId + '/txs/chain/' + txid);
  }

  getAddressesByPrefix$(prefix: string): Observable<string[]> {
    const lower = prefix.toLowerCase();
    if (lower.indexOf('ltc1') === 0 || lower.indexOf('tltc1') === 0) {
      prefix = lower;
    }
    return this.httpClient.get<string[]>(this.apiBaseUrl + this.apiBasePath + '/api/address-prefix/' + prefix);
  }
}
