import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { SeoService } from '@app/services/seo.service';
import { MwebApiService } from '@app/services/mweb-api.service';
import { MwebApiError, MwebKernelLookup } from '@interfaces/mweb.interface';

@Component({
  selector: 'app-mweb-kernel',
  templateUrl: './mweb-kernel.component.html',
  styleUrls: ['./mweb-kernel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class MwebKernelComponent implements OnInit {
  lookup$: Observable<MwebKernelLookup | null>;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private mwebApi: MwebApiService,
    private seoService: SeoService,
  ) {}

  ngOnInit(): void {
    this.lookup$ = this.route.paramMap.pipe(
      switchMap((params: ParamMap) => {
        const id = params.get('id') || '';
        this.seoService.setTitle('MWEB Kernel ' + (id ? id.slice(0, 12) + '…' : ''));
        this.seoService.setDescription('MWEB kernel detail page — block placement, output-spend status.');
        this.error = null;
        return this.mwebApi.getKernel$(id).pipe(catchError((err: MwebApiError | unknown) => {
          if ((err as MwebApiError)?.error?.code === 'not_found') {
            this.error = 'Kernel not found — verify the kernel ID or wait for indexer to catch up.';
          } else {
            this.error = 'MWEB explorer unavailable. Try again shortly.';
          }
          return of(null);
        }));
      }),
    );
  }
}
