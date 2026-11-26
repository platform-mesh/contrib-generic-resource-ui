# Generic Resource UI Documentation

The Generic Resource UI is a **zero-configuration, schema-driven** Angular microfrontend that automatically generates professional list, detail, and create/edit views for any Kubernetes resource.

## Documentation Index

| Document | Description |
|----------|-------------|
| [Features](./features.md) | Complete feature reference |
| [Configuration](./configuration.md) | Luigi context and UI configuration |
| [Integration](./integration.md) | Portal and GraphQL integration |
| [Architecture](./architecture.md) | Component and state management architecture |
| [Customization](./customization.md) | UI customization options |
| [Development](./development.md) | Development setup and commands |

## Quick Start

### Minimal Configuration

The UI only requires a `resourceDefinition` in the Luigi context:

```json
{
  "resourceDefinition": {
    "group": "core.platform-mesh.io",
    "version": "v1alpha1",
    "kind": "Account",
    "plural": "accounts",
    "singular": "account",
    "scope": "Cluster"
  }
}
```

### Key Capabilities

- **Auto-generated Views**: List, detail, create, and edit views generated from GraphQL schema
- **Real-time Updates**: Live subscriptions keep data synchronized
- **Schema Discovery**: Automatic field detection via GraphQL introspection
- **Professional UI**: SAP Fiori design with Fundamental NGX components
- **Multi-workspace Support**: KCP integration for multi-tenant scenarios

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Angular 19 (standalone components) |
| State Management | NgRx 19 |
| GraphQL | Apollo Angular + graphql-sse |
| UI Components | Fundamental NGX (SAP Fiori) |
| Micro Frontend | Luigi Project |
| Editor | Monaco (YAML syntax) |
