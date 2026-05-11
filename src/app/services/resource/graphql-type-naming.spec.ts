import { buildGraphQLTypeName, buildGraphQLInputTypeName } from './graphql-type-naming';
import { ResourceDefinition } from 'models/index';

function rd(group: string, version: string, kind: string): ResourceDefinition {
  return { group, version, kind, plural: '', singular: '', scope: 'Namespaced' };
}

describe('buildGraphQLTypeName', () => {
  it('core API (empty group) produces V1-prefixed name', () => {
    expect(buildGraphQLTypeName(rd('', 'v1', 'ConfigMap'))).toBe('V1ConfigMap');
    expect(buildGraphQLTypeName(rd('', 'v1', 'Pod'))).toBe('V1Pod');
    expect(buildGraphQLTypeName(rd('', 'v1', 'Service'))).toBe('V1Service');
    expect(buildGraphQLTypeName(rd('', 'v1', 'Secret'))).toBe('V1Secret');
  });

  it('apps group produces AppsV1-prefixed name', () => {
    expect(buildGraphQLTypeName(rd('apps', 'v1', 'Deployment'))).toBe('AppsV1Deployment');
    expect(buildGraphQLTypeName(rd('apps', 'v1', 'StatefulSet'))).toBe('AppsV1StatefulSet');
    expect(buildGraphQLTypeName(rd('apps', 'v1', 'DaemonSet'))).toBe('AppsV1DaemonSet');
  });

  it('dotted groups are sanitized and pascalized', () => {
    expect(buildGraphQLTypeName(rd('networking.k8s.io', 'v1', 'Ingress'))).toBe('NetworkingK8sIoV1Ingress');
    expect(buildGraphQLTypeName(rd('batch', 'v1', 'Job'))).toBe('BatchV1Job');
    expect(buildGraphQLTypeName(rd('batch', 'v1', 'CronJob'))).toBe('BatchV1CronJob');
  });

  it('handles complex group names', () => {
    expect(buildGraphQLTypeName(rd('apis.kcp.io', 'v1alpha2', 'APIBinding'))).toBe('ApisKcpIoV1alpha2APIBinding');
    expect(buildGraphQLTypeName(rd('custom.io', 'v1', 'Component'))).toBe('CustomIoV1Component');
  });

  it('handles hyphenated groups', () => {
    expect(buildGraphQLTypeName(rd('my-group.example.com', 'v1', 'Thing'))).toBe('MyGroupExampleComV1Thing');
  });
});

describe('buildGraphQLInputTypeName', () => {
  it('appends _Input suffix', () => {
    expect(buildGraphQLInputTypeName(rd('', 'v1', 'ConfigMap'))).toBe('V1ConfigMap_Input');
    expect(buildGraphQLInputTypeName(rd('apps', 'v1', 'Deployment'))).toBe('AppsV1Deployment_Input');
    expect(buildGraphQLInputTypeName(rd('networking.k8s.io', 'v1', 'Ingress'))).toBe('NetworkingK8sIoV1Ingress_Input');
  });
});
