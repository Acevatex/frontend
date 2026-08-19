import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  Input,
  LOCALE_ID,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { formatNumber } from '@angular/common';
import { Subscription, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { EChartsOption } from '@app/graphs/echarts';
import { MwebApiService } from '@app/services/mweb-api.service';
import {
  formatterXAxis,
  formatterXAxisLabel,
  formatterXAxisTimeCategory,
} from '@app/shared/graphs.utils';
import {
  MwebSeriesBucket,
  MwebStatsNow,
  MwebStatsRange,
  MwebStatsSeries,
} from '@interfaces/mweb.interface';

export type MwebChartType = 'balance' | 'inputs_outputs' | 'activity' | 'kernels';
export type MwebChartRange = MwebStatsRange | 'custom';

interface SeriesEntry {
  name: string;
  field: keyof MwebSeriesBucket;
  color: string;
  scale?: number;
  type?: 'line' | 'bar';
  fillArea?: boolean;
  yAxisIndex?: number;
}

const PRESET_RANGES: { value: MwebChartRange; label: string }[] = [
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: '3y', label: '3Y' },
  { value: 'all', label: 'ALL' },
  { value: 'custom', label: 'CUSTOM' },
];

const LITOSHI_PER_LTC = 100_000_000;

@Component({
  selector: 'app-mweb-stats-chart',
  templateUrl: './mweb-stats-chart.component.html',
  styleUrls: ['./mweb-stats-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class MwebStatsChartComponent implements OnInit, OnDestroy {
  @Input() chartType: MwebChartType = 'balance';
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() defaultRange: MwebChartRange = '1y';
  @Input() height: number = 360;

  readonly presets = PRESET_RANGES;
  rangeForm: UntypedFormGroup;
  customForm: UntypedFormGroup;

  chartOptions: EChartsOption = {};
  chartInitOptions = { renderer: 'svg' };
  isLoading = true;
  errorMessage: string | null = null;
  showCustom = false;

  private sub: Subscription;
  private customSub: Subscription;

  constructor(
    private mwebApi: MwebApiService,
    private fb: UntypedFormBuilder,
    private cd: ChangeDetectorRef,
    @Inject(LOCALE_ID) private locale: string,
  ) {}

  ngOnInit(): void {
    this.rangeForm = this.fb.group({ range: this.defaultRange });
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400 * 1000);
    this.customForm = this.fb.group({
      from: this.toDateInput(ninetyDaysAgo),
      to: this.toDateInput(now),
    });
    this.showCustom = this.defaultRange === 'custom';

    this.sub = this.rangeForm.get('range').valueChanges.pipe(
      switchMap((range: MwebChartRange) => this.load(range)),
    ).subscribe();

    // initial load
    this.load(this.defaultRange).subscribe();
  }

  applyCustom(): void {
    const fromStr = this.customForm.value.from;
    const toStr = this.customForm.value.to;
    if (!fromStr || !toStr) {
      return;
    }
    const fromUnix = Math.floor(new Date(fromStr + 'T00:00:00Z').getTime() / 1000);
    const toUnix = Math.floor(new Date(toStr + 'T00:00:00Z').getTime() / 1000);
    if (!(toUnix > fromUnix)) {
      this.errorMessage = $localize`:@@mweb.chart.custom-range-invalid:"To" must be after "From".`;
      this.cd.markForCheck();
      return;
    }
    this.errorMessage = null;
    this.fetchCustom(fromUnix, toUnix);
  }

  private load(range: MwebChartRange) {
    this.showCustom = range === 'custom';
    if (range === 'custom') {
      this.applyCustom();
      return of(null);
    }
    this.isLoading = true;
    this.errorMessage = null;
    this.cd.markForCheck();

    return this.mwebApi.getStatsSeries$(range as MwebStatsRange).pipe(
      switchMap((series) => {
        return this.mwebApi.getStatsSeriesNow$(range as MwebStatsRange).pipe(
          catchError(() => of<MwebStatsNow | null>(null)),
          tap((nowBucket) => {
            const merged = this.mergeNow(series, nowBucket);
            this.prepareChart(merged);
            this.isLoading = false;
            this.cd.markForCheck();
          }),
        );
      }),
      catchError((err) => {
        this.errorMessage = err?.error?.message || $localize`:@@mweb.chart.fetch-error:Failed to load chart data`;
        this.isLoading = false;
        this.cd.markForCheck();
        return of(null);
      }),
    );
  }

  private fetchCustom(fromUnix: number, toUnix: number): void {
    this.isLoading = true;
    this.cd.markForCheck();
    this.customSub?.unsubscribe();
    this.customSub = this.mwebApi.getStatsSeries$({ fromUnix, toUnix }).pipe(
      tap((series) => {
        this.prepareChart(series);
        this.isLoading = false;
        this.cd.markForCheck();
      }),
      catchError((err) => {
        this.errorMessage = err?.error?.message || $localize`:@@mweb.chart.fetch-error:Failed to load chart data`;
        this.isLoading = false;
        this.cd.markForCheck();
        return of(null);
      }),
    ).subscribe();
  }

  private mergeNow(series: MwebStatsSeries, nowBucket: MwebStatsNow | null): MwebStatsSeries {
    if (!nowBucket) { return series; }
    const buckets = [...series.buckets];
    const last = buckets[buckets.length - 1];
    if (last && last.t === nowBucket.t) {
      buckets[buckets.length - 1] = nowBucket;
    } else {
      buckets.push(nowBucket);
    }
    return { ...series, buckets };
  }

  private seriesEntries(): SeriesEntry[] {
    switch (this.chartType) {
      case 'balance':
        return [{
          name: $localize`:@@mweb.chart.balance:MWEB supply`,
          field: 'supply_end_litoshi',
          color: '#2368d9',
          scale: 1 / LITOSHI_PER_LTC,
          fillArea: true,
        }];
      case 'inputs_outputs':
        return [
          { name: $localize`:@@mweb.inputs:Inputs`, field: 'mweb_input_count', color: '#D81B60' },
          { name: $localize`:@@mweb.outputs:Outputs`, field: 'mweb_output_count', color: '#43A047' },
        ];
      case 'activity':
        return [
          { name: $localize`:@@mweb.kernels:Kernels`, field: 'kernel_count', color: '#FFB300' },
          { name: $localize`:@@mweb.peg-ins:Peg-ins`, field: 'pegin_count', color: '#43A047' },
          { name: $localize`:@@mweb.peg-outs:Peg-outs`, field: 'pegout_count', color: '#E53935' },
          { name: $localize`:@@mweb.inputs:Inputs`, field: 'mweb_input_count', color: '#1E88E5' },
          { name: $localize`:@@mweb.outputs:Outputs`, field: 'mweb_output_count', color: '#8E24AA' },
        ];
      case 'kernels':
        return [{
          name: $localize`:@@mweb.chart.transactions:MWEB transactions`,
          field: 'kernel_count',
          color: '#2368d9',
          fillArea: true,
        }];
    }
  }

  private prepareChart(series: MwebStatsSeries | null): void {
    const buckets = series?.buckets ?? [];
    const entries = this.seriesEntries();
    const isBalance = this.chartType === 'balance';
    const isStackedBar = this.chartType === 'inputs_outputs' || this.chartType === 'activity';
    const timespanHint = this.rangeForm?.get('range')?.value || this.defaultRange;

    const echartsSeries = entries.map((entry, idx) => {
      const data = buckets.map((b) => {
        const raw = (b[entry.field] as number) ?? 0;
        const scaled = entry.scale ? raw * entry.scale : raw;
        return [b.t * 1000, scaled];
      });

      if (isStackedBar) {
        return {
          zlevel: 0,
          stack: 'Total',
          name: entry.name,
          data,
          type: 'bar',
          barWidth: '100%',
          large: true,
          itemStyle: { color: entry.color },
        };
      }

      return {
        name: entry.name,
        type: entry.type ?? 'line',
        showSymbol: false,
        symbol: 'none',
        smooth: false,
        sampling: 'lttb',
        lineStyle: { width: entries.length > 1 ? 1.5 : 2 },
        itemStyle: { color: entry.color },
        areaStyle: entry.fillArea ? {
          color: entry.color,
          opacity: 0.18,
        } : undefined,
        data,
        zlevel: idx,
      };
    });

    const yAxis: any = isBalance ? {
      type: 'value',
      scale: true,
      axisLabel: {
        color: 'rgb(110, 112, 121)',
        formatter: (v: number) => formatNumber(v, this.locale, '1.0-0') + ' LTC',
      },
      splitLine: { lineStyle: { type: 'dotted', color: 'var(--transparent-fg)', opacity: 0.25 } },
    } : {
      type: 'value',
      min: 0,
      axisLabel: {
        color: 'rgb(110, 112, 121)',
        formatter: (v: number) => formatNumber(v, this.locale, '1.0-0'),
      },
      splitLine: { lineStyle: { type: 'dotted', color: 'var(--transparent-fg)', opacity: 0.25 } },
    };

    const xAxis: any = isStackedBar ? {
      name: formatterXAxisLabel(this.locale, timespanHint),
      nameLocation: 'middle',
      nameTextStyle: { padding: [10, 0, 0, 0] },
      type: 'category',
      boundaryGap: false,
      axisLine: { onZero: true },
      axisLabel: {
        color: 'rgb(110, 112, 121)',
        formatter: (val: string) => formatterXAxisTimeCategory(this.locale, timespanHint, parseInt(val, 10)),
        align: 'center',
        fontSize: 11,
        lineHeight: 12,
        hideOverlap: true,
        padding: [0, 5],
      },
    } : {
      type: 'time',
      splitNumber: this.isMobile() ? 4 : 8,
      axisLabel: { color: 'rgb(110, 112, 121)', hideOverlap: true },
    };

    this.chartOptions = {
      animation: false,
      title: buckets.length === 0 ? {
        textStyle: { color: 'grey', fontSize: 15 },
        text: $localize`:@@mweb.chart.no-data:No data for this range`,
        left: 'center',
        top: 'center',
      } : undefined,
      grid: {
        top: isStackedBar ? (this.isMobile() ? 10 : 50) : 30,
        bottom: isStackedBar ? 80 : 60,
        left: 80,
        right: 30,
      },
      tooltip: {
        show: !(isStackedBar && this.isMobile()),
        trigger: 'axis',
        axisPointer: { type: 'line' },
        backgroundColor: 'rgba(17, 19, 31, 1)',
        borderColor: '#000',
        borderRadius: 4,
        textStyle: { color: 'var(--tooltip-grey)', align: 'left' },
        formatter: (ticks: any[]) => {
          if (!ticks?.length) { return ''; }
          const ts = isStackedBar
            ? parseInt(ticks[0].axisValue, 10)
            : ticks[0].data[0];
          const header = isStackedBar
            ? formatterXAxis(this.locale, timespanHint, ts)
            : new Date(ts).toLocaleString(this.locale, {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              });
          const rows = ticks.map((t) => {
            const v = isStackedBar ? t.data[1] : t.data[1];
            const formatted = isBalance && t.seriesIndex === 0
              ? formatNumber(v, this.locale, '1.0-4') + ' LTC'
              : formatNumber(v, this.locale, '1.0-0');
            return `${t.marker} ${t.seriesName}: <b>${formatted}</b>`;
          }).join('<br>');
          return `<b style="color:white">${header}</b><br>${rows}`;
        },
      },
      legend: entries.length > 1 ? {
        top: 0,
        padding: isStackedBar ? [10, 75] : 0,
        textStyle: { color: 'white' },
        inactiveColor: 'rgb(110, 112, 121)',
        icon: 'roundRect',
        data: entries.map(e => e.name),
      } : undefined,
      xAxis,
      yAxis,
      series: echartsSeries,
      dataZoom: isStackedBar ? [
        {
          type: 'inside', realtime: true, maxSpan: 100, minSpan: 5, moveOnMouseMove: false,
        },
        {
          type: 'slider', show: true, brushSelect: false, realtime: true,
          left: 20, right: 15, bottom: 5,
          showDetail: false,
          selectedDataBackground: {
            lineStyle: { color: '#fff', opacity: 0.45 },
            areaStyle: { opacity: 0 },
          },
        },
      ] : [
        { type: 'inside', realtime: true, zoomLock: false, minSpan: 5, moveOnMouseMove: false },
        {
          type: 'slider', show: true, brushSelect: false, realtime: true,
          left: 20, right: 15, bottom: 5,
          minSpan: 5,
          showDetail: false,
          selectedDataBackground: {
            lineStyle: { color: '#fff', opacity: 0.45 },
            areaStyle: { opacity: 0 },
          },
        },
      ],
    };
  }

  private toDateInput(d: Date): string {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private isMobile(): boolean {
    return window.innerWidth <= 767.98;
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.customSub?.unsubscribe();
  }
}
