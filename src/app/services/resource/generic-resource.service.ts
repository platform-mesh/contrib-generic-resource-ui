import { ApolloFactory } from './apollo-factory';
import { Injectable, inject } from '@angular/core';
import {
  FieldAnalysis,
  NestedFieldInfo,
  Resource,
  ResourceDefinition,
  ResourceListResult,
  ResourceNodeContext,
  ResourceOperationTypeMap,
  ResourceSubscriptionResult,
} from 'models/index';
import { gql } from 'apollo-angular';
import { Observable, throwError } from 'rxjs';
import { catchError, filter, map, startWith, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class GenericResourceService {
  private apolloFactory = inject(ApolloFactory);

  list(
    resourceDefinition: ResourceDefinition,
    fieldAnalysis: FieldAnalysis,
    context: ResourceNodeContext
  ): Observable<Resource[]> {
    const fieldsSelection = this.buildListFieldsSelection(fieldAnalysis);
    const group = this.normalizeGroupName(resourceDefinition.group);
    const hasGroup = group !== '' && group.length > 0;
    const version = resourceDefinition.version;
    const kind = this.ensureCapitalized(resourceDefinition.plural);
    const isNamespaced = resourceDefinition.scope === 'Namespaced';

    const variables: Record<string, any> = {};
    let variablesDef = '';
    let kindArgs = '';

    if (isNamespaced && context.namespaceId) {
      variablesDef = '($namespace: String)';
      kindArgs = '(namespace: $namespace)';
      variables['namespace'] = context.namespaceId;
    }

    const listQuery = hasGroup
      ? `
      query ListResources${variablesDef} {
        ${group} {
          ${version} {
            ${kind}${kindArgs} {
              resourceVersion
              items {
                ${fieldsSelection}
              }
            }
          }
        }
      }
    `
      : `
      query ListResources${variablesDef} {
        ${version} {
          ${kind}${kindArgs} {
            resourceVersion
            items {
              ${fieldsSelection}
            }
          }
        }
      }
    `;

    console.log('[GenericResourceService] List query:', listQuery);

    return this.apolloFactory
      .apollo(context)
      .query({
        query: gql`${listQuery}`,
        variables,
        fetchPolicy: 'no-cache',
        errorPolicy: 'all',
      })
      .pipe(
        map((res: any): ResourceListResult => {
          const path = group ? `${group}.${version}.${kind}` : `${version}.${kind}`;
          return this.getValueByPath(res.data, path);
        }),
        switchMap((listResult: ResourceListResult) => {
          const { resourceVersion, items } = listResult;
          // Subscription field name format: {group}_{version}_{plural} or {version}_{plural} for core API
          const subscriptionOperation = group
            ? `${group}_${version}_${resourceDefinition.plural}`.toLowerCase()
            : `${version}_${resourceDefinition.plural}`.toLowerCase();

          let subVariablesDef = '($resourceVersion: String!)';
          let subArgs = '(resourceVersion: $resourceVersion)';
          const subVariables: Record<string, any> = { resourceVersion };

          if (isNamespaced && context.namespaceId) {
            subVariablesDef = '($resourceVersion: String!, $namespace: String)';
            subArgs = '(resourceVersion: $resourceVersion, namespace: $namespace)';
            subVariables['namespace'] = context.namespaceId;
          }

          const subscriptionQuery = `
            subscription WatchResources${subVariablesDef} {
              ${subscriptionOperation}${subArgs} {
                type
                object {
                  ${fieldsSelection}
                }
              }
            }
          `;
          console.log('[GenericResourceService] Subscription query:', subscriptionQuery);

          const result = new Map<string, Resource>(
            items.map((item) => [item.metadata.uid!, item])
          );

          return this.apolloFactory
            .apollo(context)
            .subscribe({
              query: gql`${subscriptionQuery}`,
              variables: subVariables,
            })
            .pipe(
              map((res: any): Resource[] => {
                const resourceResult: ResourceSubscriptionResult | undefined =
                  this.getValueByPath(res.data, subscriptionOperation);

                if (!resourceResult) {
                  return Array.from(result.values());
                }

                const { type, object } = resourceResult;
                if (type === ResourceOperationTypeMap.ADDED) {
                  result.set(object.metadata.uid!, object);
                } else if (type === ResourceOperationTypeMap.MODIFIED) {
                  result.set(object.metadata.uid!, object);
                } else if (type === ResourceOperationTypeMap.DELETED) {
                  result.delete(object.metadata.uid!);
                }

                return Array.from(result.values());
              }),
              startWith(Array.from(result.values()))
            );
        }),
        catchError((error) => {
          console.error('Error listing resources', error);
          return throwError(() => error);
        })
      );
  }

  read(
    resourceName: string,
    resourceDefinition: ResourceDefinition,
    fieldAnalysis: FieldAnalysis,
    context: ResourceNodeContext,
    readFromParentKcpPath = false
  ): Observable<Resource> {
    const fieldsSelection = this.buildDetailFieldsSelection(fieldAnalysis);
    const group = this.normalizeGroupName(resourceDefinition.group);
    const version = resourceDefinition.version;
    const kind = resourceDefinition.kind;
    const isNamespaced = resourceDefinition.scope === 'Namespaced';

    const variables: Record<string, any> = { name: resourceName };
    let variablesDef = '($name: String!)';
    let kindArgs = '(name: $name)';

    if (isNamespaced && context.namespaceId) {
      variablesDef = '($name: String!, $namespace: String)';
      kindArgs = '(name: $name, namespace: $namespace)';
      variables['namespace'] = context.namespaceId;
    }

    const readQuery = group
      ? `
      query GetResource${variablesDef} {
        ${group} {
          ${version} {
            ${kind}${kindArgs} {
              ${fieldsSelection}
            }
          }
        }
      }
    `
      : `
      query GetResource${variablesDef} {
        ${version} {
          ${kind}${kindArgs} {
            ${fieldsSelection}
          }
        }
      }
    `;

    return this.apolloFactory
      .apollo(context, readFromParentKcpPath)
      .query({
        query: gql`${readQuery}`,
        variables,
        fetchPolicy: 'no-cache',
        errorPolicy: 'all',
      })
      .pipe(
        map((res: any): Resource => {
          const path = group ? `${group}.${version}.${kind}` : `${version}.${kind}`;
          return this.getValueByPath(res.data, path);
        }),
        catchError((error) => {
          console.error('Error reading resource', error);
          return throwError(() => error);
        })
      );
  }

  watch(
    resourceName: string,
    resourceDefinition: ResourceDefinition,
    fieldAnalysis: FieldAnalysis,
    context: ResourceNodeContext,
    readFromParentKcpPath = false
  ): Observable<Resource> {
    const fieldsSelection = this.buildDetailFieldsSelection(fieldAnalysis);
    const group = this.normalizeGroupName(resourceDefinition.group);
    const version = resourceDefinition.version;
    const kind = resourceDefinition.kind;
    const isNamespaced = resourceDefinition.scope === 'Namespaced';

    const variables: Record<string, any> = { name: resourceName };
    let variablesDef = '($name: String!)';
    let kindArgs = '(name: $name)';

    if (isNamespaced && context.namespaceId) {
      variablesDef = '($name: String!, $namespace: String)';
      kindArgs = '(name: $name, namespace: $namespace)';
      variables['namespace'] = context.namespaceId;
    }

    const readQuery = group
      ? `
      query GetResource${variablesDef} {
        ${group} {
          ${version} {
            ${kind}${kindArgs} {
              ${fieldsSelection}
            }
          }
        }
      }
    `
      : `
      query GetResource${variablesDef} {
        ${version} {
          ${kind}${kindArgs} {
            ${fieldsSelection}
          }
        }
      }
    `;

    return this.apolloFactory
      .apollo(context, readFromParentKcpPath)
      .query({
        query: gql`${readQuery}`,
        variables,
        fetchPolicy: 'no-cache',
        errorPolicy: 'all',
      })
      .pipe(
        map((res: any): Resource => {
          const path = group ? `${group}.${version}.${kind}` : `${version}.${kind}`;
          return this.getValueByPath(res.data, path);
        }),
        switchMap((resource: Resource) => {
          const resourceVersion = resource.metadata.resourceVersion;
          const subscriptionOperation = group
            ? `${group}_${version}_${resourceDefinition.plural}`.toLowerCase()
            : `${version}_${resourceDefinition.plural}`.toLowerCase();

          let subVariablesDef = '($resourceVersion: String!)';
          let subArgs = '(resourceVersion: $resourceVersion)';
          const subVariables: Record<string, any> = { resourceVersion };

          if (isNamespaced && context.namespaceId) {
            subVariablesDef = '($resourceVersion: String!, $namespace: String)';
            subArgs = '(resourceVersion: $resourceVersion, namespace: $namespace)';
            subVariables['namespace'] = context.namespaceId;
          }

          const subscriptionQuery = `
            subscription WatchResource${subVariablesDef} {
              ${subscriptionOperation}${subArgs} {
                type
                object {
                  ${fieldsSelection}
                }
              }
            }
          `;
          console.log('[GenericResourceService] Detail subscription query:', subscriptionQuery);

          let currentResource = resource;

          return this.apolloFactory
            .apollo(context)
            .subscribe({
              query: gql`${subscriptionQuery}`,
              variables: subVariables,
            })
            .pipe(
              map((res: any): Resource | null => {
                const resourceResult: ResourceSubscriptionResult | undefined =
                  this.getValueByPath(res.data, subscriptionOperation);

                if (!resourceResult) {
                  return currentResource;
                }

                const { type, object } = resourceResult;
                // Only update if this is the resource we're watching
                if (object.metadata.name !== resourceName) {
                  return currentResource;
                }

                if (type === ResourceOperationTypeMap.MODIFIED) {
                  currentResource = object;
                  return currentResource;
                } else if (type === ResourceOperationTypeMap.DELETED) {
                  return null;
                }

                return currentResource;
              }),
              filter((resource): resource is Resource => resource !== null),
              startWith(currentResource)
            );
        }),
        catchError((error) => {
          console.error('Error watching resource', error);
          return throwError(() => error);
        })
      );
  }

  create(
    resource: Resource,
    resourceDefinition: ResourceDefinition,
    context: ResourceNodeContext,
    dryRun = false
  ): Observable<any> {
    const group = this.normalizeGroupName(resourceDefinition.group);
    const version = resourceDefinition.version;
    const kind = resourceDefinition.kind;
    const isNamespaced = resourceDefinition.scope === 'Namespaced';

    const variables: Record<string, any> = { object: resource };
    let variablesDef = `($object: ${kind}Input!)`;
    let mutationArgs = '(object: $object)';

    if (isNamespaced && context.namespaceId) {
      variablesDef = `($object: ${kind}Input!, $namespace: String)`;
      mutationArgs = '(object: $object, namespace: $namespace)';
      variables['namespace'] = context.namespaceId;
    }

    if (dryRun) {
      variablesDef = variablesDef.slice(0, -1) + ', $dryRun: [String!])';
      mutationArgs = mutationArgs.slice(0, -1) + ', dryRun: $dryRun)';
      variables['dryRun'] = ['All'];
    }

    const createMutation = group
      ? `
      mutation CreateResource${variablesDef} {
        ${group} {
          ${version} {
            create${kind}${mutationArgs} {
              __typename
            }
          }
        }
      }
    `
      : `
      mutation CreateResource${variablesDef} {
        ${version} {
          create${kind}${mutationArgs} {
            __typename
          }
        }
      }
    `;

    return this.apolloFactory
      .apollo(context)
      .mutate({
        mutation: gql`${createMutation}`,
        variables,
        fetchPolicy: 'no-cache',
      })
      .pipe(
        catchError((error) => {
          console.error('Error creating resource', error);
          return throwError(() => error);
        })
      );
  }

  update(
    resource: Resource,
    resourceDefinition: ResourceDefinition,
    context: ResourceNodeContext,
    dryRun = false
  ): Observable<any> {
    const group = this.normalizeGroupName(resourceDefinition.group);
    const version = resourceDefinition.version;
    const kind = resourceDefinition.kind;
    const isNamespaced = resourceDefinition.scope === 'Namespaced';

    const cleanResource = this.stripTypename(resource);

    const variables: Record<string, any> = {
      name: resource.metadata.name,
      object: cleanResource,
    };
    let variablesDef = `($name: String!, $object: ${kind}Input!)`;
    let mutationArgs = '(name: $name, object: $object)';

    if (isNamespaced && context.namespaceId) {
      variablesDef = `($name: String!, $object: ${kind}Input!, $namespace: String)`;
      mutationArgs = '(name: $name, object: $object, namespace: $namespace)';
      variables['namespace'] = context.namespaceId;
    }

    if (dryRun) {
      variablesDef = variablesDef.slice(0, -1) + ', $dryRun: [String!])';
      mutationArgs = mutationArgs.slice(0, -1) + ', dryRun: $dryRun)';
      variables['dryRun'] = ['All'];
    }

    const updateMutation = group
      ? `
      mutation UpdateResource${variablesDef} {
        ${group} {
          ${version} {
            update${kind}${mutationArgs} {
              __typename
            }
          }
        }
      }
    `
      : `
      mutation UpdateResource${variablesDef} {
        ${version} {
          update${kind}${mutationArgs} {
            __typename
          }
        }
      }
    `;

    return this.apolloFactory
      .apollo(context)
      .mutate({
        mutation: gql`${updateMutation}`,
        variables,
        fetchPolicy: 'no-cache',
      })
      .pipe(
        catchError((error) => {
          console.error('Error updating resource', error);
          return throwError(() => error);
        })
      );
  }

  readYaml(
    resourceName: string,
    resourceDefinition: ResourceDefinition,
    context: ResourceNodeContext
  ): Observable<string> {
    const group = this.normalizeGroupName(resourceDefinition.group);
    const version = resourceDefinition.version;
    const kind = resourceDefinition.kind;
    const isNamespaced = resourceDefinition.scope === 'Namespaced';

    const variables: Record<string, any> = { name: resourceName };
    let variablesDef = '($name: String!)';
    let kindArgs = '(name: $name)';

    if (isNamespaced && context.namespaceId) {
      variablesDef = '($name: String!, $namespace: String)';
      kindArgs = '(name: $name, namespace: $namespace)';
      variables['namespace'] = context.namespaceId;
    }

    const yamlQuery = group
      ? `
      query GetResourceYaml${variablesDef} {
        ${group} {
          ${version} {
            ${kind}Yaml${kindArgs}
          }
        }
      }
    `
      : `
      query GetResourceYaml${variablesDef} {
        ${version} {
          ${kind}Yaml${kindArgs}
        }
      }
    `;

    console.log('[GenericResourceService] YAML query:', yamlQuery);

    return this.apolloFactory
      .apollo(context)
      .query({
        query: gql`${yamlQuery}`,
        variables,
        fetchPolicy: 'no-cache',
      })
      .pipe(
        map((res: any): string => {
          const path = group ? `${group}.${version}.${kind}Yaml` : `${version}.${kind}Yaml`;
          return this.getValueByPath(res.data, path);
        }),
        catchError((error) => {
          console.error('Error reading resource YAML', error);
          return throwError(() => error);
        })
      );
  }

  delete(
    resourceName: string,
    resourceDefinition: ResourceDefinition,
    context: ResourceNodeContext
  ): Observable<any> {
    const group = this.normalizeGroupName(resourceDefinition.group);
    const version = resourceDefinition.version;
    const kind = resourceDefinition.kind;
    const isNamespaced = resourceDefinition.scope === 'Namespaced';

    const variables: Record<string, any> = { name: resourceName };
    let variablesDef = '($name: String!)';
    let mutationArgs = '(name: $name)';

    if (isNamespaced && context.namespaceId) {
      variablesDef = '($name: String!, $namespace: String)';
      mutationArgs = '(name: $name, namespace: $namespace)';
      variables['namespace'] = context.namespaceId;
    }

    const deleteMutation = group
      ? `
      mutation DeleteResource${variablesDef} {
        ${group} {
          ${version} {
            delete${kind}${mutationArgs}
          }
        }
      }`
      : `
      mutation DeleteResource${variablesDef} {
        ${version} {
          delete${kind}${mutationArgs}
        }
      }
    `;

    return this.apolloFactory
      .apollo(context)
      .mutate({
        mutation: gql`${deleteMutation}`,
        variables,
      })
      .pipe(
        catchError((error) => {
          console.error('Error deleting resource', error);
          return throwError(() => error);
        })
      );
  }

  applyYaml(
    yaml: string,
    context: ResourceNodeContext
  ): Observable<string> {
    const applyMutation = `
      mutation ApplyYaml($yaml: String!) {
        applyYaml(yaml: $yaml)
      }
    `;

    console.log('[GenericResourceService] Apply YAML mutation:', applyMutation);

    return this.apolloFactory
      .apollo(context)
      .mutate({
        mutation: gql`${applyMutation}`,
        variables: { yaml },
        fetchPolicy: 'no-cache',
      })
      .pipe(
        map((res: any) => res.data?.applyYaml),
        catchError((error) => {
          console.error('Error applying YAML', error);
          return throwError(() => error);
        })
      );
  }

  private buildListFieldsSelection(fieldAnalysis: FieldAnalysis): string {
    const metadataFields = ['name', 'namespace', 'uid', 'creationTimestamp', 'labels'];
    const specFields = fieldAnalysis.scalarSpecFields
      .slice(0, 5)
      .map((f) => f.name);
    const statusFields = fieldAnalysis.statusFields
      .slice(0, 3)
      .map((f) => f.name);

    const nestedSpecSelection = this.buildNestedFieldSelection(
      fieldAnalysis.nestedSpecFields.slice(0, 2),
      1
    );

    let selection = `metadata { ${metadataFields.join(' ')} }`;

    const specSelections = [
      ...specFields,
      nestedSpecSelection,
    ].filter(Boolean);

    if (specSelections.length > 0) {
      selection += `\nspec { ${specSelections.join(' ')} }`;
    }

    if (statusFields.length > 0 || fieldAnalysis.conditionsField) {
      let statusSelection = statusFields.join(' ');
      if (fieldAnalysis.conditionsField) {
        statusSelection += ' conditions { type status reason message lastTransitionTime }';
      }
      if (statusSelection.trim()) {
        selection += `\nstatus { ${statusSelection} }`;
      }
    }

    return selection;
  }

  private buildDetailFieldsSelection(fieldAnalysis: FieldAnalysis): string {
    const metadataFields = [
      'name',
      'namespace',
      'uid',
      'resourceVersion',
      'creationTimestamp',
      'deletionTimestamp',
      'labels',
      'annotations',
      'generation',
    ];

    const specFields = fieldAnalysis.allSpecFields
      .filter((f) => f.isScalar)
      .map((f) => f.name);
    const statusFields = fieldAnalysis.allStatusFields
      .filter((f) => f.isScalar)
      .map((f) => f.name);

    const nestedSpecSelection = this.buildNestedFieldSelection(
      fieldAnalysis.nestedSpecFields,
      3
    );
    const nestedStatusSelection = this.buildNestedFieldSelection(
      fieldAnalysis.nestedStatusFields,
      3
    );

    let selection = `metadata { ${metadataFields.join(' ')} }`;

    // Add root-level fields (for ConfigMap, Secret, etc.)
    const scalarRootLevelFields = fieldAnalysis.rootLevelFields
      ?.filter((f) => f.isScalar)
      .map((f) => f.name) ?? [];
    const nestedRootLevelSelection = this.buildNestedFieldSelection(
      fieldAnalysis.nestedRootLevelFields ?? [],
      3
    );
    const rootLevelSelections = [...scalarRootLevelFields, nestedRootLevelSelection].filter(Boolean);
    if (rootLevelSelections.length > 0) {
      selection += `\n${rootLevelSelections.join(' ')}`;
    }

    const specSelections = [
      ...specFields,
      nestedSpecSelection,
    ].filter(Boolean);

    if (specSelections.length > 0) {
      selection += `\nspec { ${specSelections.join(' ')} }`;
    }

    const statusSelections = [
      ...statusFields,
      nestedStatusSelection,
    ].filter(Boolean);

    if (statusSelections.length > 0 || fieldAnalysis.conditionsField) {
      let statusSelection = statusSelections.join(' ');
      if (fieldAnalysis.conditionsField) {
        statusSelection += ' conditions { type status reason message lastTransitionTime }';
      }
      if (statusSelection.trim()) {
        selection += `\nstatus { ${statusSelection} }`;
      }
    }

    return selection;
  }


  private buildNestedFieldSelection(
    nestedFields: NestedFieldInfo[],
    maxDepth: number
  ): string {
    if (!nestedFields || nestedFields.length === 0) {
      return '';
    }

    return nestedFields
      .map((nested) => this.buildNestedFieldSelectionRecursive(nested, 0, maxDepth))
      .filter(Boolean)
      .join(' ');
  }

  private buildNestedFieldSelectionRecursive(
    nestedInfo: NestedFieldInfo,
    currentDepth: number,
    maxDepth: number
  ): string {
    if (currentDepth >= maxDepth) {
      return '';
    }

    const fieldName = nestedInfo.field.name;
    const scalarNames = nestedInfo.scalarChildren.map((f) => f.name);

    const nestedSelections = nestedInfo.nestedChildren
      .map((child) =>
        this.buildNestedFieldSelectionRecursive(child, currentDepth + 1, maxDepth)
      )
      .filter(Boolean);

    const allSelections = [...scalarNames, ...nestedSelections];

    if (allSelections.length === 0) {
      return '';
    }

    return `${fieldName} { ${allSelections.join(' ')} }`;
  }

  private normalizeGroupName(group: string): string {
    return group.replace(/[.\-]/g, '_');
  }

  private ensureCapitalized(str: string): string {
    // Handle compound words like "serviceaccounts" -> "ServiceAccounts"
    // Check for common compound patterns
    const compoundPatterns: Record<string, string> = {
      'serviceaccounts': 'ServiceAccounts',
      'configmaps': 'ConfigMaps',
      'replicasets': 'ReplicaSets',
      'daemonsets': 'DaemonSets',
      'statefulsets': 'StatefulSets',
      'persistentvolumes': 'PersistentVolumes',
      'persistentvolumeclaims': 'PersistentVolumeClaims',
      'storageclasses': 'StorageClasses',
      'resourcequotas': 'ResourceQuotas',
      'limitranges': 'LimitRanges',
      'horizontalpodautoscalers': 'HorizontalPodAutoscalers',
      'poddisruptionbudgets': 'PodDisruptionBudgets',
      'networkpolicies': 'NetworkPolicies',
      'ingresses': 'Ingresses',
      'clusterroles': 'ClusterRoles',
      'clusterrolebindings': 'ClusterRoleBindings',
      'rolebindings': 'RoleBindings',
    };

    const lower = str.toLowerCase();
    if (compoundPatterns[lower]) {
      return compoundPatterns[lower];
    }

    // Default: capitalize first letter
    if (str.charAt(0) === str.charAt(0).toUpperCase()) {
      return str;
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  }

  private stripTypename(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.stripTypename(item));
    }

    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const key of Object.keys(obj)) {
        if (key !== '__typename') {
          result[key] = this.stripTypename(obj[key]);
        }
      }
      return result;
    }

    return obj;
  }
}
