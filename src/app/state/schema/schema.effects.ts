import { loadSchema, loadSchemaFailure, loadSchemaSuccess } from './schema.actions';
import { loadResources } from '../resources/resources.actions';
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, switchMap, withLatestFrom } from 'rxjs/operators';
import { FieldAnalyzerService } from 'services/schema/field-analyzer.service';
import { SchemaService } from 'services/schema/schema.service';
import { selectContext } from 'state/context/context.selectors';
import { IntrospectionType, ResourceDefinition, ResourceNodeContext } from 'models/index';
import { buildGraphQLTypeName, buildGraphQLInputTypeName } from 'services/resource/graphql-type-naming';

@Injectable()
export class SchemaEffects {
  private actions$ = inject(Actions);
  private store = inject(Store);
  private schemaService = inject(SchemaService);
  private fieldAnalyzer = inject(FieldAnalyzerService);

  loadSchema$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadSchema),
      withLatestFrom(this.store.select(selectContext)),
      switchMap(([{ resourceDefinition }, context]) => {
        console.log('[SchemaEffects] loadSchema triggered, resourceDefinition:', resourceDefinition);
        console.log('[SchemaEffects] context:', context);

        if (!context) {
          console.error('[SchemaEffects] No context available');
          return of(loadSchemaFailure({ error: 'No context available' }));
        }

        // Use readFromParentKcpPath from resource definition config
        const readFromParentKcpPath = resourceDefinition.readFromParentKcpPath ?? false;

        // Build fully-qualified type name matching gateway naming convention
        // Format: Pascalize(SanitizedGroup + "_" + Version) + Kind e.g., AppsV1Deployment, V1ConfigMap
        const versionedTypeName = buildGraphQLTypeName(resourceDefinition);
        console.log('[SchemaEffects] Introspecting versioned type:', versionedTypeName);
        console.log('[SchemaEffects] Using GraphQL URL:', context.portalContext?.crdGatewayApiUrl);
        console.log('[SchemaEffects] readFromParentKcpPath:', readFromParentKcpPath);

        return this.schemaService
          .introspectType(versionedTypeName, context, readFromParentKcpPath)
          .pipe(
            switchMap((resourceType) => {
              console.log('[SchemaEffects] Introspection result for', versionedTypeName, ':', resourceType);

              if (!resourceType) {
                return of(
                  loadSchemaFailure({
                    error: `Type ${versionedTypeName} not found in schema`,
                  })
                );
              }

              return this.processResourceType(resourceType, resourceDefinition, context, readFromParentKcpPath);
            }),
            catchError((error) => {
              console.error('[SchemaEffects] Error loading schema:', error);
              return of(loadSchemaFailure({ error: error.message }));
            })
          );
      })
    )
  );

  private processResourceType(
    resourceType: IntrospectionType,
    resourceDefinition: ResourceDefinition,
    context: ResourceNodeContext,
    readFromParentKcpPath: boolean
  ): Observable<ReturnType<typeof loadSchemaSuccess> | ReturnType<typeof loadSchemaFailure>> {
    // Extract nested type names from fields
    const nestedTypeNames = this.extractNestedTypeNames(resourceType);
    console.log('[SchemaEffects] Nested type names to introspect:', nestedTypeNames);

    // Introspect input type and all nested types
    const versionedInputTypeName = buildGraphQLInputTypeName(resourceDefinition);
    const queries: Record<string, Observable<IntrospectionType | null>> = {
      inputType: this.schemaService.introspectType(versionedInputTypeName, context, readFromParentKcpPath),
    };
    nestedTypeNames.forEach((name) => {
      queries[name] = this.schemaService.introspectType(name, context, readFromParentKcpPath);
    });

    return forkJoin(queries).pipe(
      map((results) => {
        console.log('[SchemaEffects] All introspection results:', results);
        const inputType = results['inputType'] as IntrospectionType | null;
        const nestedResults = { ...results };
        delete nestedResults['inputType'];

        // Enrich resourceType with nested type field info
        const enrichedResourceType = this.enrichResourceType(resourceType, nestedResults as Record<string, IntrospectionType | null>);
        console.log('[SchemaEffects] Enriched resource type:', enrichedResourceType);

        const fieldAnalysis = this.fieldAnalyzer.analyzeFields(enrichedResourceType);
        console.log('[SchemaEffects] Field analysis:', fieldAnalysis);

        return loadSchemaSuccess({
          resourceType: enrichedResourceType,
          inputType,
          fieldAnalysis,
        });
      })
    );
  }

  private extractNestedTypeNames(resourceType: IntrospectionType): string[] {
    const typeNames = new Set<string>();
    const fields = resourceType.fields ?? [];
    const excludedFields = ['apiVersion', 'kind', '__typename'];

    for (const field of fields) {
      if (excludedFields.includes(field.name)) {
        continue;
      }

      // Unwrap NON_NULL/LIST wrappers to get the actual type name
      let type = field.type;
      while (type.ofType) {
        type = type.ofType;
      }

      // Only add OBJECT types (not scalars)
      if (type.kind === 'OBJECT' && type.name && !type.name.startsWith('__')) {
        typeNames.add(type.name);

        // Also extract nested type names from the type's fields (if available from introspection)
        // This handles cases where spec/status/root-level fields have nested objects
        if (type.fields) {
          for (const nestedField of type.fields) {
            this.extractTypeNamesRecursive(nestedField.type, typeNames, 2);
          }
        }
      }
    }
    return Array.from(typeNames);
  }

  private extractTypeNamesRecursive(type: IntrospectionType, typeNames: Set<string>, depth: number): void {
    if (depth <= 0) return;

    // Unwrap NON_NULL/LIST wrappers
    let unwrapped = type;
    while (unwrapped.ofType) {
      unwrapped = unwrapped.ofType;
    }

    // Only add OBJECT types (not scalars)
    if (unwrapped.kind === 'OBJECT' && unwrapped.name && !unwrapped.name.startsWith('__')) {
      typeNames.add(unwrapped.name);

      // Recursively extract from nested fields if available
      if (unwrapped.fields) {
        for (const field of unwrapped.fields) {
          this.extractTypeNamesRecursive(field.type, typeNames, depth - 1);
        }
      }
    }
  }

  private enrichResourceType(
    resourceType: IntrospectionType,
    nestedTypes: Record<string, IntrospectionType | null>
  ): IntrospectionType {
    const excludedFields = ['apiVersion', 'kind', '__typename'];

    const fields = resourceType.fields?.map((field) => {
      if (excludedFields.includes(field.name)) {
        return field;
      }

      // Find the unwrapped type name
      let type = field.type;
      while (type.ofType) {
        type = type.ofType;
      }

      // Only enrich OBJECT types
      if (type.kind !== 'OBJECT') {
        return field;
      }

      const typeName = type.name;
      const nestedType = typeName ? nestedTypes[typeName] : null;

      if (nestedType) {
        // Rebuild the type structure with nested fields included
        // Also recursively enrich the nested fields within
        const enrichedNestedType = this.enrichNestedTypeRecursively(nestedType, nestedTypes);
        return {
          ...field,
          type: this.enrichTypeWithFields(field.type, enrichedNestedType),
        };
      }

      return field;
    }) ?? [];

    return { ...resourceType, fields };
  }

  private enrichNestedTypeRecursively(
    type: IntrospectionType,
    nestedTypes: Record<string, IntrospectionType | null>
  ): IntrospectionType {
    if (!type.fields) {
      return type;
    }

    const enrichedFields = type.fields.map((field) => {
      // Unwrap the field type
      let unwrapped = field.type;
      while (unwrapped.ofType) {
        unwrapped = unwrapped.ofType;
      }

      const typeName = unwrapped.name;
      const nestedType = typeName ? nestedTypes[typeName] : null;

      if (nestedType && nestedType.fields) {
        // Recursively enrich this nested type
        const enrichedNestedType = this.enrichNestedTypeRecursively(nestedType, nestedTypes);
        return {
          ...field,
          type: this.enrichTypeWithFields(field.type, enrichedNestedType),
        };
      }

      return field;
    });

    return { ...type, fields: enrichedFields };
  }

  private enrichTypeWithFields(type: IntrospectionType, nestedType: IntrospectionType): IntrospectionType {
    if (type.ofType) {
      return { ...type, ofType: this.enrichTypeWithFields(type.ofType, nestedType) };
    }
    // At the base type, add the fields from the introspected nested type
    return { ...type, fields: nestedType.fields, inputFields: nestedType.inputFields };
  }

  schemaLoaded$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadSchemaSuccess),
      map(() => loadResources())
    )
  );
}
