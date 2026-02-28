import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DashboardCardSpec, ResourceNodeContext } from 'models/index';
import { CountCardComponent } from '../count-card/count-card.component';
import { ListCardComponent } from '../list-card/list-card.component';
import { StatusSummaryCardComponent } from '../status-summary-card/status-summary-card.component';
import { StatusTableCardComponent } from '../status-table-card/status-table-card.component';
import { BarChartCardComponent } from '../bar-chart-card/bar-chart-card.component';

@Component({
  selector: 'app-card-host',
  imports: [
    CountCardComponent,
    ListCardComponent,
    StatusSummaryCardComponent,
    StatusTableCardComponent,
    BarChartCardComponent,
  ],
  template: `
    @switch (spec().type) {
      @case ('count-card') {
        <app-count-card [spec]="spec()" [context]="context()"></app-count-card>
      }
      @case ('list') {
        <app-list-card [spec]="spec()" [context]="context()"></app-list-card>
      }
      @case ('status-summary') {
        <app-status-summary-card [spec]="spec()" [context]="context()"></app-status-summary-card>
      }
      @case ('status-table') {
        <app-status-table-card [spec]="spec()" [context]="context()"></app-status-table-card>
      }
      @case ('bar-chart') {
        <app-bar-chart-card [spec]="spec()" [context]="context()"></app-bar-chart-card>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardHostComponent {
  readonly spec = input.required<DashboardCardSpec>();
  readonly context = input.required<ResourceNodeContext>();
}
