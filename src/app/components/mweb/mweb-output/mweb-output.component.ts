import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, shareReplay, switchMap } from 'rxjs/operators';
import { SeoService } from '@app/services/seo.service';
import { MwebApiService } from '@app/services/mweb-api.service';
import { MwebApiError, MwebOutputSpend, MwebOutputView } from '@interfaces/mweb.interface';

@Component({
  selector: 'app-mweb-output',
  templateUrl: './mweb-output.component.html',
  styleUrls: ['./mweb-output.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class MwebOutputComponent implements OnInit {
  view$: Observable<MwebOutputView | null>;
  spend$: Observable<MwebOutputSpend | null>;
  error: string | null = null;
  spendError: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private mwebApi: MwebApiService,
    private seoService: SeoService,
  ) {}

  ngOnInit(): void {
    this.view$ = this.route.paramMap.pipe(
      switchMap((params: ParamMap) => {
        const id = params.get('id') || '';
        this.seoService.setTitle('MWEB Output ' + (id ? id.slice(0, 12) + '…' : ''));
        this.seoService.setDescription('MWEB output detail — commitment, range proof, stealth address, spend state.');
        this.error = null;
        return this.mwebApi.getOutput$(id).pipe(catchError((err: MwebApiError | unknown) => {
          if ((err as MwebApiError)?.error?.code === 'not_found') {
            this.error = 'Output not found — verify the output ID or wait for indexer to catch up.';
          } else {
            this.error = 'MWEB explorer unavailable. Try again shortly.';
          }
          return of(null);
        }));
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    this.spend$ = this.view$.pipe(
      switchMap((view) => {
        this.spendError = null;
        if (!view || view.spentAtHeight == null) {
          return of(null);
        }
        return this.mwebApi.getInputByOutput$(view.output.outputId).pipe(catchError((err: MwebApiError | unknown) => {
          if ((err as MwebApiError)?.error?.code === 'not_found') {
            this.spendError = 'Spend record temporarily unavailable — try again shortly.';
          } else {
            this.spendError = 'Could not load the spending input.';
          }
          return of(null);
        }));
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

  chunkHex(value: string | undefined | null, chunkSize = 64): string {
    if (!value || value.length <= chunkSize) {
      return value ?? '';
    }
    const lines: string[] = [];
    for (let i = 0; i < value.length; i += chunkSize) {
      lines.push(value.substring(i, i + chunkSize));
    }
    return lines.join('\n');
  }
}
