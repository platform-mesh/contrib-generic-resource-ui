import { Resource } from 'models/index';
import { createAction, props } from '@ngrx/store';

export const loadResources = createAction('[Resources] Load');

export const loadResourcesSuccess = createAction(
  '[Resources] Load Success',
  props<{ resources: Resource[] }>()
);

export const loadResourcesFailure = createAction(
  '[Resources] Load Failure',
  props<{ error: string }>()
);

export const resourcesUpdated = createAction(
  '[Resources] Updated',
  props<{ resources: Resource[] }>()
);

export const selectResource = createAction(
  '[Resources] Select',
  props<{ resourceName: string }>()
);

export const loadResourceDetail = createAction(
  '[Resources] Load Detail',
  props<{ resourceName: string }>()
);

export const loadResourceDetailSuccess = createAction(
  '[Resources] Load Detail Success',
  props<{ resource: Resource }>()
);

export const resourceDetailUpdated = createAction(
  '[Resources] Detail Updated',
  props<{ resource: Resource }>()
);

export const loadResourceDetailFailure = createAction(
  '[Resources] Load Detail Failure',
  props<{ error: string }>()
);

export const createResource = createAction(
  '[Resources] Create',
  props<{ resource: Resource; dryRun?: boolean }>()
);

export const createResourceSuccess = createAction(
  '[Resources] Create Success',
  props<{ resource: Resource }>()
);

export const createResourceFailure = createAction(
  '[Resources] Create Failure',
  props<{ error: string }>()
);

export const updateResource = createAction(
  '[Resources] Update',
  props<{ resource: Resource; dryRun?: boolean }>()
);

export const updateResourceSuccess = createAction(
  '[Resources] Update Success',
  props<{ resource: Resource }>()
);

export const updateResourceFailure = createAction(
  '[Resources] Update Failure',
  props<{ error: string }>()
);

export const deleteResource = createAction(
  '[Resources] Delete',
  props<{ resourceName: string; resourceNamespace?: string }>()
);

export const deleteResourceSuccess = createAction(
  '[Resources] Delete Success',
  props<{ resourceName: string }>()
);

export const deleteResourceFailure = createAction(
  '[Resources] Delete Failure',
  props<{ error: string }>()
);

export const clearResources = createAction('[Resources] Clear');

export const clearSelectedResource = createAction(
  '[Resources] Clear Selected'
);

export const applyYaml = createAction(
  '[Resources] Apply YAML',
  props<{ yaml: string }>()
);

export const applyYamlSuccess = createAction('[Resources] Apply YAML Success');

export const applyYamlFailure = createAction(
  '[Resources] Apply YAML Failure',
  props<{ error: string }>()
);
