import { DashboardCard } from 'models/index';

export const MOCK_DASHBOARD_CARDS: DashboardCard[] = [
  {
    metadata: {
      name: 'clusters-count',
      uid: 'dc-1',
      labels: {
        'ui.platform-mesh.io/dashboard': 'workspace-dashboard',
        'ui.platform-mesh.io/source': 'operator-registered',
        'ui.platform-mesh.io/category': 'infrastructure',
        'ui.platform-mesh.io/card-id': 'clusters-count',
      },
    },
    spec: {
      type: 'count-card',
      title: 'Clusters',
      description: 'Total Gardener shoot clusters',
      priority: 10,
      category: 'infrastructure',
      resource: { group: 'core.gardener.cloud', version: 'v1beta1', kind: 'Shoot', plural: 'shoots', scope: 'Namespaced' },
      config: { showStatusBreakdown: true, icon: 'cloud' },
    },
  },
  {
    metadata: {
      name: 'service-instances-count',
      uid: 'dc-2',
      labels: {
        'ui.platform-mesh.io/dashboard': 'workspace-dashboard',
        'ui.platform-mesh.io/source': 'operator-registered',
        'ui.platform-mesh.io/category': 'services',
        'ui.platform-mesh.io/card-id': 'service-instances-count',
      },
    },
    spec: {
      type: 'count-card',
      title: 'Service Instances',
      description: 'Cloud service instances',
      priority: 20,
      category: 'services',
      resource: { group: 'services.cloud.sap.com', version: 'v1', kind: 'ServiceInstance', plural: 'serviceinstances', scope: 'Namespaced' },
      config: { showStatusBreakdown: true },
    },
  },
  {
    metadata: {
      name: 'recent-accounts',
      uid: 'dc-3',
      labels: {
        'ui.platform-mesh.io/dashboard': 'workspace-dashboard',
        'ui.platform-mesh.io/source': 'operator-registered',
        'ui.platform-mesh.io/category': 'identity',
        'ui.platform-mesh.io/card-id': 'recent-accounts',
      },
    },
    spec: {
      type: 'list',
      title: 'Recent Accounts',
      description: 'Platform accounts',
      priority: 30,
      category: 'identity',
      resource: { group: 'core.platform-mesh.io', version: 'v1alpha1', kind: 'Account', plural: 'accounts', scope: 'Cluster' },
      config: { maxItems: 5 },
    },
  },
  {
    metadata: {
      name: 'extension-health',
      uid: 'dc-4',
      labels: {
        'ui.platform-mesh.io/dashboard': 'workspace-dashboard',
        'ui.platform-mesh.io/source': 'operator-registered',
        'ui.platform-mesh.io/category': 'infrastructure',
        'ui.platform-mesh.io/card-id': 'extension-health',
      },
    },
    spec: {
      type: 'status-summary',
      title: 'Extension Health',
      description: 'Health overview of installed extensions',
      priority: 40,
      category: 'infrastructure',
      resource: { group: 'extensions.platform-mesh.io', version: 'v1alpha1', kind: 'Extension', plural: 'extensions', scope: 'Cluster' },
      config: { showPercentages: true },
    },
  },
  {
    metadata: {
      name: 'cluster-overview',
      uid: 'dc-5',
      labels: {
        'ui.platform-mesh.io/dashboard': 'workspace-dashboard',
        'ui.platform-mesh.io/source': 'operator-registered',
        'ui.platform-mesh.io/category': 'infrastructure',
        'ui.platform-mesh.io/card-id': 'cluster-overview',
      },
    },
    spec: {
      type: 'status-table',
      title: 'Cluster Overview',
      description: 'Detailed status of all Gardener clusters',
      priority: 15,
      category: 'infrastructure',
      resource: { group: 'core.gardener.cloud', version: 'v1beta1', kind: 'Shoot', plural: 'shoots', scope: 'Namespaced' },
    },
  },
  {
    metadata: {
      name: 'clusters-by-provider',
      uid: 'dc-6',
      labels: {
        'ui.platform-mesh.io/dashboard': 'workspace-dashboard',
        'ui.platform-mesh.io/source': 'operator-registered',
        'ui.platform-mesh.io/category': 'infrastructure',
        'ui.platform-mesh.io/card-id': 'clusters-by-provider',
      },
    },
    spec: {
      type: 'bar-chart',
      title: 'Clusters by Provider',
      description: 'Distribution of clusters across cloud providers',
      priority: 50,
      category: 'infrastructure',
      resource: { group: 'core.gardener.cloud', version: 'v1beta1', kind: 'Shoot', plural: 'shoots', scope: 'Namespaced' },
      config: { groupBy: 'spec.provider.type' },
    },
  },
  {
    metadata: {
      name: 'permissions-overview',
      uid: 'dc-7',
      labels: {
        'ui.platform-mesh.io/dashboard': 'workspace-dashboard',
        'ui.platform-mesh.io/source': 'operator-registered',
        'ui.platform-mesh.io/category': 'security',
        'ui.platform-mesh.io/card-id': 'permissions-overview',
      },
    },
    spec: {
      type: 'bar-chart',
      title: 'Roles Distribution',
      description: 'Active roles and permission assignments',
      priority: 60,
      category: 'security',
      resource: { group: 'security.platform-mesh.io', version: 'v1alpha1', kind: 'RoleAssignment', plural: 'roleassignments', scope: 'Namespaced' },
      config: { groupBy: 'spec.role' },
    },
  },
];
