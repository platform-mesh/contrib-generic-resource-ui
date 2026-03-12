import {
  applyYaml,
  applyYamlFailure,
  applyYamlSuccess,
  createResource,
  createResourceFailure,
  createResourceSuccess,
  deleteResource,
  deleteResourceFailure,
  deleteResourceSuccess,
  loadResourceDetail,
  loadResourceDetailFailure,
  loadResourceDetailSuccess,
  loadResources,
  loadResourcesFailure,
  loadResourcesSuccess,
  resourceDetailUpdated,
  resourcesUpdated,
  updateResource,
  updateResourceFailure,
  updateResourceSuccess,
} from './resources.actions';
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { catchError, map, switchMap, withLatestFrom } from 'rxjs/operators';
import { GenericResourceService } from 'services/resource/generic-resource.service';
import { selectContext, selectResourceDefinition } from 'state/context/context.selectors';
import { selectFieldAnalysis } from 'state/schema/schema.selectors';

@Injectable()
export class ResourcesEffects {
  private actions$ = inject(Actions);
  private store = inject(Store);
  private resourceService = inject(GenericResourceService);

  loadResources$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadResources),
      withLatestFrom(
        this.store.select(selectContext),
        this.store.select(selectResourceDefinition),
        this.store.select(selectFieldAnalysis)
      ),
      switchMap(([, context, resourceDefinition, fieldAnalysis]) => {
        if (!context || !resourceDefinition || !fieldAnalysis) {
          return of(
            loadResourcesFailure({
              error: 'Missing context, resource definition, or schema',
            })
          );
        }

        return this.resourceService
          .list(resourceDefinition, fieldAnalysis, context)
          .pipe(
            map((resources) => {
              if (Array.isArray(resources)) {
                return loadResourcesSuccess({ resources });
              }
              return resourcesUpdated({ resources });
            }),
            catchError((error) =>
              of(loadResourcesFailure({ error: error.message }))
            )
          );
      })
    )
  );

  loadResourceDetail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadResourceDetail),
      withLatestFrom(
        this.store.select(selectContext),
        this.store.select(selectResourceDefinition),
        this.store.select(selectFieldAnalysis)
      ),
      switchMap(([{ resourceName }, context, resourceDefinition, fieldAnalysis]) => {
        if (!context || !resourceDefinition || !fieldAnalysis) {
          return of(
            loadResourceDetailFailure({
              error: 'Missing context, resource definition, or schema',
            })
          );
        }

        // Use readFromParentKcpPath from resource definition config
        const readFromParentKcpPath = resourceDefinition.readFromParentKcpPath ?? false;
        let isFirstEmission = true;

        return this.resourceService
          .watch(resourceName, resourceDefinition, fieldAnalysis, context, readFromParentKcpPath)
          .pipe(
            map((resource) => {
              if (isFirstEmission) {
                isFirstEmission = false;
                return loadResourceDetailSuccess({ resource });
              }
              return resourceDetailUpdated({ resource });
            }),
            catchError((error) => {
              console.error('Error watching resource', error);
              return of(loadResourceDetailFailure({ error: error.message }));
            })
          );
      })
    )
  );

  createResource$ = createEffect(() =>
    this.actions$.pipe(
      ofType(createResource),
      withLatestFrom(
        this.store.select(selectContext),
        this.store.select(selectResourceDefinition)
      ),
      switchMap(([{ resource, dryRun }, context, resourceDefinition]) => {
        if (!context || !resourceDefinition) {
          return of(
            createResourceFailure({
              error: 'Missing context or resource definition',
            })
          );
        }

        return this.resourceService
          .create(resource, resourceDefinition, context, dryRun)
          .pipe(
            map(() => createResourceSuccess({ resource })),
            catchError((error) =>
              of(createResourceFailure({ error: error.message }))
            )
          );
      })
    )
  );

  updateResource$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateResource),
      withLatestFrom(
        this.store.select(selectContext),
        this.store.select(selectResourceDefinition)
      ),
      switchMap(([{ resource, dryRun }, context, resourceDefinition]) => {
        if (!context || !resourceDefinition) {
          return of(
            updateResourceFailure({
              error: 'Missing context or resource definition',
            })
          );
        }

        return this.resourceService
          .update(resource, resourceDefinition, context, dryRun)
          .pipe(
            map(() => updateResourceSuccess({ resource })),
            catchError((error) =>
              of(updateResourceFailure({ error: error.message }))
            )
          );
      })
    )
  );

  deleteResource$ = createEffect(() =>
    this.actions$.pipe(
      ofType(deleteResource),
      withLatestFrom(
        this.store.select(selectContext),
        this.store.select(selectResourceDefinition)
      ),
      switchMap(([{ resourceName, resourceNamespace }, context, resourceDefinition]) => {
        if (!context || !resourceDefinition) {
          return of(
            deleteResourceFailure({
              error: 'Missing context or resource definition',
            })
          );
        }

        // Use the resource's own namespace if context doesn't have one
        const effectiveContext = resourceNamespace && !context.namespaceId
          ? { ...context, namespaceId: resourceNamespace }
          : context;

        return this.resourceService
          .delete(resourceName, resourceDefinition, effectiveContext)
          .pipe(
            map(() => deleteResourceSuccess({ resourceName })),
            catchError((error) =>
              of(deleteResourceFailure({ error: error.message }))
            )
          );
      })
    )
  );

  applyYaml$ = createEffect(() =>
    this.actions$.pipe(
      ofType(applyYaml),
      withLatestFrom(this.store.select(selectContext)),
      switchMap(([{ yaml }, context]) => {
        if (!context) {
          return of(
            applyYamlFailure({
              error: 'Missing context',
            })
          );
        }

        return this.resourceService
          .applyYaml(yaml, context)
          .pipe(
            map(() => applyYamlSuccess()),
            catchError((error) =>
              of(applyYamlFailure({ error: error.message }))
            )
          );
      })
    )
  );

}
