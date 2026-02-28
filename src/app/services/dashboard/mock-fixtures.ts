import { Resource } from 'models/index';

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

const MOCK_SHOOTS: Resource[] = [
  {
    apiVersion: 'core.gardener.cloud/v1beta1',
    kind: 'Shoot',
    metadata: { name: 'prod-eu-01', namespace: 'garden-team-a', uid: 'shoot-1', creationTimestamp: daysAgo(90) },
    spec: { provider: { type: 'aws' }, region: 'eu-central-1' },
    status: { conditions: [{ type: 'Ready', status: 'True', message: 'Cluster is healthy' }] },
  },
  {
    apiVersion: 'core.gardener.cloud/v1beta1',
    kind: 'Shoot',
    metadata: { name: 'staging-us-01', namespace: 'garden-team-a', uid: 'shoot-2', creationTimestamp: daysAgo(45) },
    spec: { provider: { type: 'gcp' }, region: 'us-east1' },
    status: { conditions: [{ type: 'Ready', status: 'True', message: 'Cluster is healthy' }] },
  },
  {
    apiVersion: 'core.gardener.cloud/v1beta1',
    kind: 'Shoot',
    metadata: { name: 'dev-asia-01', namespace: 'garden-team-b', uid: 'shoot-3', creationTimestamp: daysAgo(10) },
    spec: { provider: { type: 'azure' }, region: 'southeastasia' },
    status: { phase: 'Creating' },
  },
  {
    apiVersion: 'core.gardener.cloud/v1beta1',
    kind: 'Shoot',
    metadata: { name: 'test-eu-02', namespace: 'garden-team-a', uid: 'shoot-4', creationTimestamp: daysAgo(60) },
    spec: { provider: { type: 'aws' }, region: 'eu-west-1' },
    status: { conditions: [{ type: 'Ready', status: 'False', reason: 'NodeNotReady', message: 'Node pool unhealthy' }] },
  },
  {
    apiVersion: 'core.gardener.cloud/v1beta1',
    kind: 'Shoot',
    metadata: { name: 'prod-us-02', namespace: 'garden-team-c', uid: 'shoot-5', creationTimestamp: daysAgo(120) },
    spec: { provider: { type: 'aws' }, region: 'us-west-2' },
    status: { conditions: [{ type: 'Ready', status: 'True', message: 'Cluster is healthy' }] },
  },
];

const MOCK_SERVICE_INSTANCES: Resource[] = [
  {
    apiVersion: 'services.cloud.sap.com/v1',
    kind: 'ServiceInstance',
    metadata: { name: 'hana-prod', namespace: 'default', uid: 'si-1', creationTimestamp: daysAgo(30) },
    spec: { serviceOfferingName: 'hana-cloud', servicePlanName: 'hana' },
    status: { conditions: [{ type: 'Ready', status: 'True', message: 'Instance provisioned' }] },
  },
  {
    apiVersion: 'services.cloud.sap.com/v1',
    kind: 'ServiceInstance',
    metadata: { name: 'xsuaa-prod', namespace: 'default', uid: 'si-2', creationTimestamp: daysAgo(28) },
    spec: { serviceOfferingName: 'xsuaa', servicePlanName: 'application' },
    status: { conditions: [{ type: 'Ready', status: 'True', message: 'Instance provisioned' }] },
  },
  {
    apiVersion: 'services.cloud.sap.com/v1',
    kind: 'ServiceInstance',
    metadata: { name: 'destination-prod', namespace: 'default', uid: 'si-3', creationTimestamp: daysAgo(25) },
    spec: { serviceOfferingName: 'destination', servicePlanName: 'lite' },
    status: { conditions: [{ type: 'Ready', status: 'True', message: 'Instance provisioned' }] },
  },
  {
    apiVersion: 'services.cloud.sap.com/v1',
    kind: 'ServiceInstance',
    metadata: { name: 'connectivity-prod', namespace: 'default', uid: 'si-4', creationTimestamp: daysAgo(20) },
    spec: { serviceOfferingName: 'connectivity', servicePlanName: 'connectivity_proxy' },
    status: { conditions: [{ type: 'Ready', status: 'True', message: 'Instance provisioned' }] },
  },
  {
    apiVersion: 'services.cloud.sap.com/v1',
    kind: 'ServiceInstance',
    metadata: { name: 'malware-scanner', namespace: 'default', uid: 'si-5', creationTimestamp: daysAgo(15) },
    spec: { serviceOfferingName: 'malware-scanner', servicePlanName: 'clamav' },
    status: { conditions: [{ type: 'Ready', status: 'True', message: 'Instance provisioned' }] },
  },
  {
    apiVersion: 'services.cloud.sap.com/v1',
    kind: 'ServiceInstance',
    metadata: { name: 'auditlog-staging', namespace: 'staging', uid: 'si-6', creationTimestamp: daysAgo(5) },
    spec: { serviceOfferingName: 'auditlog', servicePlanName: 'standard' },
    status: { conditions: [{ type: 'Ready', status: 'True', message: 'Instance provisioned' }] },
  },
  {
    apiVersion: 'services.cloud.sap.com/v1',
    kind: 'ServiceInstance',
    metadata: { name: 'redis-dev', namespace: 'dev', uid: 'si-7', creationTimestamp: daysAgo(2) },
    spec: { serviceOfferingName: 'redis-cache', servicePlanName: 'standard' },
    status: { phase: 'Provisioning' },
  },
  {
    apiVersion: 'services.cloud.sap.com/v1',
    kind: 'ServiceInstance',
    metadata: { name: 'object-store-test', namespace: 'test', uid: 'si-8', creationTimestamp: daysAgo(1) },
    spec: { serviceOfferingName: 'objectstore', servicePlanName: 's3-standard' },
    status: { conditions: [{ type: 'Ready', status: 'False', reason: 'ProvisionFailed', message: 'Quota exceeded' }] },
  },
];

const MOCK_ACCOUNTS: Resource[] = [
  {
    apiVersion: 'core.platform-mesh.io/v1alpha1',
    kind: 'Account',
    metadata: { name: 'acme-corp', uid: 'acc-1', creationTimestamp: daysAgo(180) },
    spec: { displayName: 'Acme Corporation', region: 'eu' },
    status: { phase: 'Active' },
  },
  {
    apiVersion: 'core.platform-mesh.io/v1alpha1',
    kind: 'Account',
    metadata: { name: 'globex-inc', uid: 'acc-2', creationTimestamp: daysAgo(90) },
    spec: { displayName: 'Globex Inc', region: 'us' },
    status: { phase: 'Active' },
  },
  {
    apiVersion: 'core.platform-mesh.io/v1alpha1',
    kind: 'Account',
    metadata: { name: 'initech-dev', uid: 'acc-3', creationTimestamp: daysAgo(7) },
    spec: { displayName: 'Initech (Dev)', region: 'ap' },
    status: { phase: 'Creating' },
  },
];

const MOCK_ROLE_ASSIGNMENTS: Resource[] = [
  {
    apiVersion: 'security.platform-mesh.io/v1alpha1',
    kind: 'RoleAssignment',
    metadata: { name: 'admin-alice', namespace: 'acme-corp', uid: 'ra-1', creationTimestamp: daysAgo(170) },
    spec: { user: 'alice@acme.com', role: 'admin' },
    status: { conditions: [{ type: 'Ready', status: 'True' }] },
  },
  {
    apiVersion: 'security.platform-mesh.io/v1alpha1',
    kind: 'RoleAssignment',
    metadata: { name: 'viewer-bob', namespace: 'acme-corp', uid: 'ra-2', creationTimestamp: daysAgo(150) },
    spec: { user: 'bob@acme.com', role: 'viewer' },
    status: { conditions: [{ type: 'Ready', status: 'True' }] },
  },
  {
    apiVersion: 'security.platform-mesh.io/v1alpha1',
    kind: 'RoleAssignment',
    metadata: { name: 'editor-carol', namespace: 'globex-inc', uid: 'ra-3', creationTimestamp: daysAgo(80) },
    spec: { user: 'carol@globex.io', role: 'editor' },
    status: { conditions: [{ type: 'Ready', status: 'True' }] },
  },
  {
    apiVersion: 'security.platform-mesh.io/v1alpha1',
    kind: 'RoleAssignment',
    metadata: { name: 'admin-dave', namespace: 'globex-inc', uid: 'ra-4', creationTimestamp: daysAgo(75) },
    spec: { user: 'dave@globex.io', role: 'admin' },
    status: { conditions: [{ type: 'Ready', status: 'True' }] },
  },
  {
    apiVersion: 'security.platform-mesh.io/v1alpha1',
    kind: 'RoleAssignment',
    metadata: { name: 'viewer-eve', namespace: 'acme-corp', uid: 'ra-5', creationTimestamp: daysAgo(60) },
    spec: { user: 'eve@acme.com', role: 'viewer' },
    status: { conditions: [{ type: 'Ready', status: 'True' }] },
  },
  {
    apiVersion: 'security.platform-mesh.io/v1alpha1',
    kind: 'RoleAssignment',
    metadata: { name: 'pending-frank', namespace: 'initech-dev', uid: 'ra-6', creationTimestamp: daysAgo(1) },
    spec: { user: 'frank@initech.com', role: 'admin' },
    status: { conditions: [{ type: 'Ready', status: 'Unknown', reason: 'Pending' }] },
  },
];

const MOCK_EXTENSIONS: Resource[] = [
  {
    apiVersion: 'extensions.platform-mesh.io/v1alpha1',
    kind: 'Extension',
    metadata: { name: 'monitoring', uid: 'ext-1', creationTimestamp: daysAgo(60) },
    spec: { displayName: 'Monitoring Stack', version: '1.2.0' },
    status: { phase: 'Active' },
  },
  {
    apiVersion: 'extensions.platform-mesh.io/v1alpha1',
    kind: 'Extension',
    metadata: { name: 'logging', uid: 'ext-2', creationTimestamp: daysAgo(55) },
    spec: { displayName: 'Logging Pipeline', version: '2.0.1' },
    status: { phase: 'Active' },
  },
  {
    apiVersion: 'extensions.platform-mesh.io/v1alpha1',
    kind: 'Extension',
    metadata: { name: 'cert-manager', uid: 'ext-3', creationTimestamp: daysAgo(3) },
    spec: { displayName: 'Certificate Manager', version: '1.14.0' },
    status: { phase: 'Initializing' },
  },
  {
    apiVersion: 'extensions.platform-mesh.io/v1alpha1',
    kind: 'Extension',
    metadata: { name: 'ingress', uid: 'ext-4', creationTimestamp: daysAgo(50) },
    spec: { displayName: 'Ingress Controller', version: '4.8.3' },
    status: { phase: 'Failed' },
  },
];

export const MOCK_RESOURCE_MAP: Record<string, Resource[]> = {
  shoots: MOCK_SHOOTS,
  serviceinstances: MOCK_SERVICE_INSTANCES,
  accounts: MOCK_ACCOUNTS,
  roleassignments: MOCK_ROLE_ASSIGNMENTS,
  extensions: MOCK_EXTENSIONS,
};
