import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { MwebApiService } from '@app/services/mweb-api.service';
import {
  MwebBlockResponse,
  MwebCanonicalPegin,
  MwebHogExPegoutOutput,
  MwebInput,
  MwebKernel,
  MwebOutput,
} from '@interfaces/mweb.interface';

interface KernelRow {
  kernel: MwebKernel;
  pegins: MwebCanonicalPegin[];
  pegoutTotal: number;
}

type UnmatchReason = 'unmatched' | 'missing-index' | 'index-out-of-range' | 'slot-out-of-range';

interface UnmatchedPegin {
  pegin: MwebCanonicalPegin;
  reason: UnmatchReason;
}

interface UnmatchedHogexPegout {
  pegout: MwebHogExPegoutOutput;
  reason: UnmatchReason;
}

interface BlockSectionView {
  resp: MwebBlockResponse;
  kernelRows: KernelRow[];
  unmatchedPegins: UnmatchedPegin[];
  unmatchedHogexPegouts: UnmatchedHogexPegout[];
}

const PAGE_SIZE = 50;

@Component({
  selector: 'app-mweb-block-section',
  templateUrl: './mweb-block-section.component.html',
  styleUrls: ['./mweb-block-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class MwebBlockSectionComponent implements OnChanges {
  @Input() blockHash: string;

  view$: Observable<BlockSectionView | null>;
  readonly pageSize = PAGE_SIZE;
  kernelsPage = 1;
  inputsPage = 1;
  outputsPage = 1;
  showDetails = false;

  constructor(private mwebApi: MwebApiService) {}

  ngOnChanges(changes: SimpleChanges): void {
    const change = changes['blockHash'];
    if (!change || !this.blockHash) {
      return;
    }
    if (!change.isFirstChange() && change.currentValue === change.previousValue) {
      return;
    }
    this.kernelsPage = 1;
    this.inputsPage = 1;
    this.outputsPage = 1;
    this.showDetails = false;
    this.view$ = this.mwebApi.getBlock$(this.blockHash).pipe(
      map((resp) => resp ? this.buildView(resp) : null),
      catchError(() => of(null)),
    );
  }

  toggleShowDetails(): void {
    this.showDetails = !this.showDetails;
  }

  trackByKernel(_: number, row: KernelRow): string {
    return row.kernel.kernelId;
  }

  trackByInput(_: number, input: MwebInput): string {
    return input.inputHash;
  }

  trackByOutput(_: number, output: MwebOutput): string {
    return output.outputId;
  }

  pageStart(page: number): number {
    return (page - 1) * PAGE_SIZE;
  }

  pageEnd(page: number): number {
    return page * PAGE_SIZE;
  }

  private buildView(resp: MwebBlockResponse): BlockSectionView {
    const kernels = resp.block?.mweb?.kernels ?? [];
    const pegins = resp.block?.canonicalPegins ?? [];
    const hogexPegouts = resp.block?.hogEx?.pegoutOutputs ?? [];

    const kernelByIndex = new Map<number, MwebKernel>();
    for (const k of kernels) {
      kernelByIndex.set(k.index, k);
    }

    const peginsByKernel = new Map<number, MwebCanonicalPegin[]>();
    const unmatchedPegins: UnmatchedPegin[] = [];
    for (const pegin of pegins) {
      const idx = pegin.matchedKernelIdx;
      if (!pegin.kernelMatched) {
        unmatchedPegins.push({ pegin, reason: 'unmatched' });
        continue;
      }
      if (typeof idx !== 'number') {
        unmatchedPegins.push({ pegin, reason: 'missing-index' });
        continue;
      }
      if (!kernelByIndex.has(idx)) {
        unmatchedPegins.push({ pegin, reason: 'index-out-of-range' });
        continue;
      }
      const list = peginsByKernel.get(idx) ?? [];
      list.push(pegin);
      peginsByKernel.set(idx, list);
    }

    const unmatchedHogexPegouts: UnmatchedHogexPegout[] = [];
    for (const out of hogexPegouts) {
      const m = out.matchedKernel;
      if (!m) {
        unmatchedHogexPegouts.push({ pegout: out, reason: 'unmatched' });
        continue;
      }
      if (typeof m.kernelIdx !== 'number') {
        unmatchedHogexPegouts.push({ pegout: out, reason: 'missing-index' });
        continue;
      }
      if (!kernelByIndex.has(m.kernelIdx)) {
        unmatchedHogexPegouts.push({ pegout: out, reason: 'index-out-of-range' });
        continue;
      }
      const slots = kernelByIndex.get(m.kernelIdx)!.pegouts ?? [];
      if (typeof m.pegoutIdx !== 'number' || m.pegoutIdx < 0 || m.pegoutIdx >= slots.length) {
        unmatchedHogexPegouts.push({ pegout: out, reason: 'slot-out-of-range' });
      }
    }

    const kernelRows: KernelRow[] = kernels.map((k) => ({
      kernel: k,
      pegins: peginsByKernel.get(k.index) ?? [],
      pegoutTotal: (k.pegouts ?? []).reduce((acc, slot) => acc + slot.value, 0),
    }));

    return { resp, kernelRows, unmatchedPegins, unmatchedHogexPegouts };
  }
}
