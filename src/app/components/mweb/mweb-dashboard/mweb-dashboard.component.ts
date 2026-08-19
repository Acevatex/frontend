import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { Observable, Subscription, of, timer } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { SeoService } from '@app/services/seo.service';
import { MwebApiService } from '@app/services/mweb-api.service';
import {
  MwebBlockResponse,
  MwebMempoolBroadcast,
  MwebSupplySnapshot,
  MwebSyncStatus,
} from '@interfaces/mweb.interface';

@Component({
  selector: 'app-mweb-dashboard',
  templateUrl: './mweb-dashboard.component.html',
  styleUrls: ['./mweb-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class MwebDashboardComponent implements OnInit, OnDestroy {
  supply$: Observable<MwebSupplySnapshot | null>;
  syncStatus$: Observable<MwebSyncStatus | null>;
  tip$: Observable<MwebBlockResponse | null>;
  pending$: Observable<{ items: MwebMempoolBroadcast[]; total: number } | null>;
  private subs: Subscription[] = [];

  constructor(
    private mwebApi: MwebApiService,
    private seoService: SeoService,
  ) {}

  ngOnInit(): void {
    this.seoService.setTitle('MWEB Explorer');
    this.seoService.setDescription('Litecoin MimbleWimble Extension Block (MWEB) explorer: current supply, sync status, and pending broadcasts.');

    this.supply$ = timer(0, 10000).pipe(
      switchMap(() => this.mwebApi.getSupplyCurrent$().pipe(catchError(() => of(null)))),
    );
    this.syncStatus$ = timer(0, 30000).pipe(
      switchMap(() => this.mwebApi.getSyncStatus$().pipe(catchError(() => of(null)))),
    );
    this.tip$ = timer(0, 15000).pipe(
      switchMap(() => this.mwebApi.getBlockTip$().pipe(catchError(() => of(null)))),
    );
    this.pending$ = timer(0, 8000).pipe(
      switchMap(() => this.mwebApi.getMempool$(undefined, 60).pipe(catchError(() => of(null)))),
      map((page) => {
        if (!page) { return null; }
        const items = (page.items || [])
          .filter((b) => b.Status === 'pending')
          .slice(0, 24);
        return { items, total: (page.items || []).filter((b) => b.Status === 'pending').length };
      }),
    );
  }

  trackByMempoolTxId(_: number, item: MwebMempoolBroadcast): string {
    return item.MempoolTxID;
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }
}
