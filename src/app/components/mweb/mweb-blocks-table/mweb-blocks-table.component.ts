import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, Subscription, combineLatest, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { MwebApiService } from '@app/services/mweb-api.service';
import { MwebBlocksListItem, MwebBlocksListPage } from '@interfaces/mweb.interface';

const PAGE_SIZE = 25;

@Component({
  selector: 'app-mweb-blocks-table',
  templateUrl: './mweb-blocks-table.component.html',
  styleUrls: ['./mweb-blocks-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class MwebBlocksTableComponent implements OnInit, OnDestroy {
  readonly pageSize = PAGE_SIZE;
  readonly maxPaginationSize = window.matchMedia('(max-width: 670px)').matches ? 3 : 5;
  readonly skeletonRows = [...Array(PAGE_SIZE).keys()];

  page = 1;
  totalCount = 0;
  asOfHeight: number | null = null;
  isLoading = true;
  errorMessage: string | null = null;
  items: MwebBlocksListItem[] = [];

  private pageSubject = new BehaviorSubject<number>(1);
  private sub: Subscription;

  constructor(
    private mwebApi: MwebApiService,
    private cd: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const count$ = this.mwebApi.getBlocksCount$().pipe(
      tap(c => {
        this.totalCount = c.count;
        this.asOfHeight = c.as_of_height;
      }),
      catchError(() => of({ count: 0, as_of_height: 0 })),
    );

    this.sub = combineLatest([count$, this.pageSubject]).pipe(
      switchMap(([countResp, page]) => {
        this.isLoading = true;
        this.errorMessage = null;
        this.cd.markForCheck();
        // Page 1 → omit before_height (latest). Subsequent pages compute a cursor
        // from the top tip so each page lands on the right slice even as new blocks arrive.
        const beforeHeight = page === 1
          ? undefined
          : Math.max(0, countResp.as_of_height + 1 - (page - 1) * PAGE_SIZE);
        return this.mwebApi.getBlocksList$(beforeHeight, PAGE_SIZE).pipe(
          catchError((err) => {
            this.errorMessage = err?.error?.message || 'Failed to load MWEB blocks';
            return of<MwebBlocksListPage>({
              items: [],
              page_size: PAGE_SIZE,
              next_cursor: null,
              has_more: false,
              as_of_height: countResp.as_of_height,
            });
          }),
        );
      }),
      tap(page => {
        this.items = page.items;
        if (page.as_of_height) {
          this.asOfHeight = page.as_of_height;
        }
        this.isLoading = false;
        this.cd.markForCheck();
      }),
    ).subscribe();
  }

  pageChange(page: number): void {
    this.page = page;
    this.pageSubject.next(page);
  }

  trackByHeight(_: number, item: MwebBlocksListItem): number {
    return item.block_height;
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
