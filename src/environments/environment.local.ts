export const environment = {
  production: false,
  mockGraphql: true,
  luigiContextOverwrite: {
    token: 'your-local-token',
    portalContext: {
      crdGatewayApiUrl: 'http://localhost:8080/graphql',
    },
    resourceDefinition: {
      group: 'core.platform-mesh.io',
      version: 'v1alpha1',
      kind: 'Account',
      plural: 'accounts',
      singular: 'account',
      scope: 'Cluster',
    },
  } as Partial<any>,
};
