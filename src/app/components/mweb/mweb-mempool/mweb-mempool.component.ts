import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Observable, of, timer } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { SeoService } from '@app/services/seo.service';
import { MwebApiService } from '@app/services/mweb-api.service';
import { MwebMempoolPage } from '@interfaces/mweb.interface';

@Component({
  selector: 'app-mweb-mempool',
  templateUrl: './mweb-mempool.component.html',
  styleUrls: ['./mweb-mempool.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class MwebMempoolComponent implements OnInit {
  page$: Observable<MwebMempoolPage | null>;

  constructor(
    private mwebApi: MwebApiService,
    private seoService: SeoService,
  ) {}

  ngOnInit(): void {
    this.seoService.setTitle('MWEB Mempool');
    this.seoService.setDescription('Pending MWEB broadcasts on the Litecoin network.');

    this.page$ = timer(0, 10000).pipe(
      switchMap(() => this.mwebApi.getMempool$(undefined, 100).pipe(catchError(() => of(null)))),
    );
  }
}
