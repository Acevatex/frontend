import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { NgxEchartsModule } from 'ngx-echarts';
import { SharedModule } from '@app/shared/shared.module';
import { MwebDashboardComponent } from '@components/mweb/mweb-dashboard/mweb-dashboard.component';
import { MwebKernelComponent } from '@components/mweb/mweb-kernel/mweb-kernel.component';
import { MwebMempoolComponent } from '@components/mweb/mweb-mempool/mweb-mempool.component';
import { MwebOutputComponent } from '@components/mweb/mweb-output/mweb-output.component';
import { MwebBlocksTableComponent } from '@components/mweb/mweb-blocks-table/mweb-blocks-table.component';
import { MwebStatsChartComponent } from '@components/mweb/mweb-stats-chart/mweb-stats-chart.component';

const routes: Routes = [
  { path: '', component: MwebDashboardComponent },
  { path: 'kernel/:id', component: MwebKernelComponent },
  { path: 'output/:id', component: MwebOutputComponent },
  { path: 'mempool', component: MwebMempoolComponent },
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
  ],
  exports: [
    RouterModule,
  ],
})
export class MwebRoutingModule {}

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MwebRoutingModule,
    SharedModule,
    NgxEchartsModule.forRoot({
      echarts: () => import('@app/graphs/echarts').then(m => m.echarts),
    }),
  ],
  declarations: [
    MwebDashboardComponent,
    MwebKernelComponent,
    MwebMempoolComponent,
    MwebOutputComponent,
    MwebBlocksTableComponent,
    MwebStatsChartComponent,
  ],
})
export class MwebModule {}
