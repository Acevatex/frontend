import { NgModule } from '@angular/core';
import { NgxEchartsModule } from 'ngx-echarts';
import { GraphsRoutingModule } from '@app/graphs/graphs.routing.module';
import { SharedModule } from '@app/shared/shared.module';

import { BlockFeesGraphComponent } from '@components/block-fees-graph/block-fees-graph.component';
import { BlockFeesSubsidyGraphComponent } from '@components/block-fees-subsidy-graph/block-fees-subsidy-graph.component';
import { PriceChartComponent } from '@components/price-chart/price-chart.component';
import { BlockRewardsGraphComponent } from '@components/block-rewards-graph/block-rewards-graph.component';
import { BlockFeeRatesGraphComponent } from '@components/block-fee-rates-graph/block-fee-rates-graph.component';
import { BlockSizesWeightsGraphComponent } from '@components/block-sizes-weights-graph/block-sizes-weights-graph.component';
import { FeeDistributionGraphComponent } from '@components/fee-distribution-graph/fee-distribution-graph.component';
import { IncomingTransactionsGraphComponent } from '@components/incoming-transactions-graph/incoming-transactions-graph.component';
import { MempoolGraphComponent } from '@components/mempool-graph/mempool-graph.component';
import { GraphsComponent } from '@components/graphs/graphs.component';
import { StatisticsComponent } from '@components/statistics/statistics.component';
import { MempoolBlockComponent } from '@components/mempool-block/mempool-block.component';
import { PoolRankingComponent } from '@components/pool-ranking/pool-ranking.component';
import { PoolComponent } from '@components/pool/pool.component';
import { DashboardComponent } from '@app/dashboard/dashboard.component';
import { CustomDashboardComponent } from '@components/custom-dashboard/custom-dashboard.component';
import { MiningDashboardComponent } from '@components/mining-dashboard/mining-dashboard.component';
import { HashrateChartComponent } from '@components/hashrate-chart/hashrate-chart.component';
import { HashrateChartPoolsComponent } from '@components/hashrates-chart-pools/hashrate-chart-pools.component';
import { BlockHealthGraphComponent } from '@components/block-health-graph/block-health-graph.component';
import { AddressComponent } from '@components/address/address.component';
import { WalletComponent } from '@components/wallet/wallet.component';
import { WalletPreviewComponent } from '@components/wallet/wallet-preview.component';
import { AddressGraphComponent } from '@components/address-graph/address-graph.component';
import { UtxoGraphComponent } from '@components/utxo-graph/utxo-graph.component';
import { AddressesTreemap } from '@components/addresses-treemap/addresses-treemap.component';
import { TaprootAddressScriptsComponent } from '@components/taproot-address-scripts/taproot-address-scripts.component';
import { CommonModule } from '@angular/common';
import { AsmStylerPipe } from '@app/shared/pipes/asm-styler/asm-styler.pipe';

@NgModule({
  declarations: [
    DashboardComponent,
    CustomDashboardComponent,
    MempoolBlockComponent,
    AddressComponent,
    WalletComponent,
    WalletPreviewComponent,

    MiningDashboardComponent,
    PoolComponent,
    PoolRankingComponent,
    StatisticsComponent,
    GraphsComponent,
    BlockFeesGraphComponent,
    BlockFeesSubsidyGraphComponent,
    PriceChartComponent,
    BlockRewardsGraphComponent,
    BlockFeeRatesGraphComponent,
    BlockSizesWeightsGraphComponent,
    FeeDistributionGraphComponent,
    IncomingTransactionsGraphComponent,
    MempoolGraphComponent,
    HashrateChartComponent,
    HashrateChartPoolsComponent,
    BlockHealthGraphComponent,
    AddressGraphComponent,
    UtxoGraphComponent,
    AddressesTreemap,
    TaprootAddressScriptsComponent,
  ],
  imports: [
    CommonModule,
    SharedModule,
    GraphsRoutingModule,
    NgxEchartsModule.forRoot({
      echarts: () => import('@app/graphs/echarts').then(m => m.echarts),
    })
  ],
  exports: [
    NgxEchartsModule,
  ],
  providers: [
    AsmStylerPipe
  ]
})
export class GraphsModule { }
