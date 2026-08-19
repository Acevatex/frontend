import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { StateService } from '@app/services/state.service';
import {
  MwebAddressCluster,
  MwebApiError,
  MwebBlockResponse,
  MwebBlocksCount,
  MwebBlocksListPage,
  MwebBroadcastsPage,
  MwebHealth,
  MwebKernelLookup,
  MwebMempoolPage,
  MwebMempoolBroadcast,
  MwebOutputSpend,
  MwebOutputView,
  MwebStatsNow,
  MwebStatsRange,
  MwebStatsSeries,
  MwebSupplySnapshot,
  MwebSyncStatus,
} from '@interfaces/mweb.interface';

const API_PREFIX = '/api/v1/mweb';

@Injectable({
  providedIn: 'root'
})
export class MwebApiService {
  private apiBaseUrl = '';
  private apiBasePath = '';

  constructor(
    private httpClient: HttpClient,
    private stateService: StateService,
  ) {
    if (!this.stateService.isBrowser) {
      this.apiBaseUrl = this.stateService.env.NGINX_PROTOCOL + '://' +
        this.stateService.env.NGINX_HOSTNAME + ':' + this.stateService.env.NGINX_PORT;
    }
    this.stateService.networkChanged$.subscribe((network) => {
      this.apiBasePath = network && network !== this.stateService.env.ROOT_NETWORK ? '/' + network : '';
    });
  }

  private url(path: string): string {
    return this.apiBaseUrl + this.apiBasePath + API_PREFIX + path;
  }

  private wrap<T>(obs: Observable<T>): Observable<T> {
    return obs.pipe(catchError((err: HttpErrorResponse) => {
      const body = err.error as MwebApiError | undefined;
      if (body && body.error && body.error.code) {
        return throwError(() => body);
      }
      return throwError(() => err);
    }));
  }

  getHealth$(): Observable<MwebHealth> {
    return this.wrap(this.httpClient.get<MwebHealth>(this.url('/healthz')));
  }

  getSyncStatus$(): Observable<MwebSyncStatus> {
    return this.wrap(this.httpClient.get<MwebSyncStatus>(this.url('/sync/status')));
  }

  getBlockTip$(): Observable<MwebBlockResponse> {
    return this.wrap(this.httpClient.get<MwebBlockResponse>(this.url('/blocks/tip')));
  }

  getBlock$(hash: string): Observable<MwebBlockResponse> {
    return this.wrap(this.httpClient.get<MwebBlockResponse>(this.url('/blocks/' + encodeURIComponent(hash))));
  }

  getBlockByHeight$(height: number): Observable<MwebBlockResponse> {
    return this.wrap(this.httpClient.get<MwebBlockResponse>(this.url('/blocks/by-height/' + height)));
  }

  getBlockBroadcasts$(hash: string, cursor?: string, limit?: number): Observable<MwebBroadcastsPage> {
    let params = new HttpParams();
    if (cursor) { params = params.set('cursor', cursor); }
    if (limit) { params = params.set('limit', String(limit)); }
    return this.wrap(this.httpClient.get<MwebBroadcastsPage>(
      this.url('/blocks/' + encodeURIComponent(hash) + '/broadcasts'),
      { params },
    ));
  }

  getKernel$(kernelId: string): Observable<MwebKernelLookup> {
    return this.wrap(this.httpClient.get<MwebKernelLookup>(this.url('/kernels/' + encodeURIComponent(kernelId))));
  }

  getOutput$(outputId: string): Observable<MwebOutputView> {
    return this.wrap(this.httpClient.get<MwebOutputView>(this.url('/outputs/' + encodeURIComponent(outputId))));
  }

  getInputByOutput$(outputId: string): Observable<MwebOutputSpend> {
    return this.wrap(this.httpClient.get<MwebOutputSpend>(this.url('/inputs/by-output/' + encodeURIComponent(outputId))));
  }

  getSupplyCurrent$(): Observable<MwebSupplySnapshot> {
    return this.wrap(this.httpClient.get<MwebSupplySnapshot>(this.url('/supply/current')));
  }

  getMempool$(cursor?: string, limit?: number): Observable<MwebMempoolPage> {
    let params = new HttpParams();
    if (cursor) { params = params.set('cursor', cursor); }
    if (limit) { params = params.set('limit', String(limit)); }
    return this.wrap(this.httpClient.get<MwebMempoolPage>(this.url('/mempool'), { params }));
  }

  getMempoolBroadcast$(mempoolTxId: string): Observable<MwebMempoolBroadcast> {
    return this.wrap(this.httpClient.get<MwebMempoolBroadcast>(
      this.url('/mempool/' + encodeURIComponent(mempoolTxId)),
    ));
  }

  getAddressCluster$(address: string): Observable<MwebAddressCluster> {
    return this.wrap(this.httpClient.get<MwebAddressCluster>(
      this.url('/addresses/' + encodeURIComponent(address) + '/cluster'),
    ));
  }

  getBlocksList$(beforeHeight?: number, limit: number = 25): Observable<MwebBlocksListPage> {
    let params = new HttpParams();
    if (beforeHeight !== undefined && beforeHeight !== null) {
      params = params.set('before_height', String(beforeHeight));
    }
    if (limit) { params = params.set('limit', String(limit)); }
    return this.wrap(this.httpClient.get<MwebBlocksListPage>(this.url('/blocks'), { params }));
  }

  getBlocksCount$(): Observable<MwebBlocksCount> {
    return this.wrap(this.httpClient.get<MwebBlocksCount>(this.url('/blocks/count')));
  }

  getStatsSeries$(range: MwebStatsRange): Observable<MwebStatsSeries>;
  getStatsSeries$(range: { fromUnix: number; toUnix: number }): Observable<MwebStatsSeries>;
  getStatsSeries$(arg: MwebStatsRange | { fromUnix: number; toUnix: number }): Observable<MwebStatsSeries> {
    let params = new HttpParams();
    if (typeof arg === 'string') {
      params = params.set('range', arg);
    } else {
      params = params.set('from', String(arg.fromUnix)).set('to', String(arg.toUnix));
    }
    return this.wrap(this.httpClient.get<MwebStatsSeries>(this.url('/stats/series'), { params }));
  }

  getStatsSeriesNow$(range: MwebStatsRange): Observable<MwebStatsNow> {
    const params = new HttpParams().set('range', range);
    return this.wrap(this.httpClient.get<MwebStatsNow>(this.url('/stats/series/now'), { params }));
  }
}
