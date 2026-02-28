import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CardHostComponent } from 'components/dashboard-cards/card-host/card-host.component';
import { DashboardCardSpec, ResourceNodeContext } from 'models/index';

@Component({
  selector: 'app-dashboard-preview',
  imports: [CardHostComponent],
  template: `
    <div class="preview-container">
      <h2 class="preview-title">Dashboard Card Preview</h2>
      <div class="card-grid">
        @for (spec of cardSpecs; track spec.title) {
          <div class="card-wrapper">
            <app-card-host [spec]="spec" [context]="mockContext"></app-card-host>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .preview-container {
        padding: 1.5rem;
        max-width: 1200px;
        margin: 0 auto;
      }
      .preview-title {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--sapTextColor);
        margin: 0 0 1.5rem;
      }
      .card-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 1rem;
      }
      .card-wrapper {
        min-width: 0;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPreviewComponent {
  readonly mockContext: ResourceNodeContext = {
    token: 'preview-token',
    resourceDefinition: {
      group: 'core.platform-mesh.io',
      version: 'v1alpha1',
      kind: 'Account',
      plural: 'accounts',
      singular: 'account',
      scope: 'Cluster',
    },
    portalContext: { crdGatewayApiUrl: 'http://localhost:8080/graphql' },
  };

  readonly cardSpecs: DashboardCardSpec[] = [
    {
      type: 'count-card',
      title: 'Clusters',
      description: 'Total Gardener shoot clusters',
      resource: { group: 'core.gardener.cloud', version: 'v1beta1', kind: 'Shoot', plural: 'shoots', scope: 'Namespaced' },
      config: { showStatusBreakdown: true, icon: 'cloud' },
    },
    {
      type: 'count-card',
      title: 'Service Instances',
      resource: { group: 'services.cloud.sap.com', version: 'v1', kind: 'ServiceInstance', plural: 'serviceinstances', scope: 'Namespaced' },
      config: { showStatusBreakdown: true },
    },
    {
      type: 'list',
      title: 'Recent Accounts',
      resource: { group: 'core.platform-mesh.io', version: 'v1alpha1', kind: 'Account', plural: 'accounts', scope: 'Cluster' },
      config: { maxItems: 5 },
    },
    {
      type: 'status-summary',
      title: 'Extension Health',
      resource: { group: 'extensions.platform-mesh.io', version: 'v1alpha1', kind: 'Extension', plural: 'extensions', scope: 'Cluster' },
      config: { showPercentages: true },
    },
    {
      type: 'status-table',
      title: 'Cluster Overview',
      resource: { group: 'core.gardener.cloud', version: 'v1beta1', kind: 'Shoot', plural: 'shoots', scope: 'Namespaced' },
    },
    {
      type: 'bar-chart',
      title: 'Clusters by Provider',
      resource: { group: 'core.gardener.cloud', version: 'v1beta1', kind: 'Shoot', plural: 'shoots', scope: 'Namespaced' },
      config: { groupBy: 'spec.provider.type' },
    },
    {
      type: 'bar-chart',
      title: 'Roles Distribution',
      resource: { group: 'security.platform-mesh.io', version: 'v1alpha1', kind: 'RoleAssignment', plural: 'roleassignments', scope: 'Namespaced' },
      config: { groupBy: 'spec.role' },
    },
  ];
}
