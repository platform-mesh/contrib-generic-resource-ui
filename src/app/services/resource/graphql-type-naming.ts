import { ResourceDefinition } from 'models/index';

/**
 * Builds the fully-qualified GraphQL type name matching the kubernetes-graphql-gateway naming convention.
 * Formula: Pascalize(SanitizeGroup + "_" + Version) + Kind
 * - Empty group (core API): Pascalize("_" + version) + kind → "V1ConfigMap"
 * - Other groups: Pascalize(sanitizedGroup + "_" + version) + kind → "AppsV1Deployment"
 */
export function buildGraphQLTypeName(resourceDefinition: ResourceDefinition): string {
  const { group, version, kind } = resourceDefinition;

  const sanitizedGroup = sanitizeGroup(group);
  const raw = sanitizedGroup ? `${sanitizedGroup}_${version}` : `_${version}`;
  return pascalize(raw) + kind;
}

export function buildGraphQLInputTypeName(resourceDefinition: ResourceDefinition): string {
  return `${buildGraphQLTypeName(resourceDefinition)}_Input`;
}

function sanitizeGroup(group: string): string {
  if (!group) return '';
  return group.replace(/[.\-]/g, '_').replace(/^(\d)/, '_$1');
}

function pascalize(str: string): string {
  return str
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join('');
}
