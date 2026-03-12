import { createAction, props } from '@ngrx/store';

export const setSearchFilter = createAction(
  '[UI] Set Search Filter',
  props<{ searchTerm: string }>()
);

export const setLabelFilter = createAction(
  '[UI] Set Label Filter',
  props<{ labelSelector: string }>()
);

export const clearFilters = createAction('[UI] Clear Filters');

export const openCreateModal = createAction('[UI] Open Create Modal');

export const openEditModal = createAction(
  '[UI] Open Edit Modal',
  props<{ resourceName: string }>()
);

export const closeModal = createAction('[UI] Close Modal');

export const openDeleteConfirmation = createAction(
  '[UI] Open Delete Confirmation',
  props<{ resourceName: string; resourceNamespace?: string }>()
);

export const closeDeleteConfirmation = createAction(
  '[UI] Close Delete Confirmation'
);

export const openYamlPanel = createAction('[UI] Open YAML Panel');

export const closeYamlPanel = createAction('[UI] Close YAML Panel');

export const toggleYamlPanel = createAction('[UI] Toggle YAML Panel');

export const setPagination = createAction(
  '[UI] Set Pagination',
  props<{ page: number; pageSize: number }>()
);

export const setSortColumn = createAction(
  '[UI] Set Sort Column',
  props<{ column: string; direction: 'asc' | 'desc' }>()
);

export const showNotification = createAction(
  '[UI] Show Notification',
  props<{ message: string; notificationType: 'success' | 'error' | 'warning' | 'info' }>()
);

export const clearNotification = createAction('[UI] Clear Notification');
