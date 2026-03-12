import { uiReducer, initialState, UiState } from './ui.reducer';
import {
  setSearchFilter,
  setLabelFilter,
  clearFilters,
  openCreateModal,
  openEditModal,
  closeModal,
  openDeleteConfirmation,
  closeDeleteConfirmation,
  openYamlPanel,
  closeYamlPanel,
  toggleYamlPanel,
  setPagination,
  setSortColumn,
  showNotification,
  clearNotification,
} from './ui.actions';

describe('UI Reducer', () => {
  describe('initial state', () => {
    it('should return the initial state', () => {
      const action = { type: 'unknown' };
      const state = uiReducer(undefined, action);

      expect(state).toEqual(initialState);
      expect(state.searchTerm).toBe('');
      expect(state.modalOpen).toBe(false);
      expect(state.yamlPanelOpen).toBe(false);
    });
  });

  describe('filter actions', () => {
    it('should handle setSearchFilter', () => {
      const action = setSearchFilter({ searchTerm: 'test-search' });
      const state = uiReducer(initialState, action);

      expect(state.searchTerm).toBe('test-search');
    });

    it('should handle setLabelFilter', () => {
      const action = setLabelFilter({ labelSelector: 'app=nginx' });
      const state = uiReducer(initialState, action);

      expect(state.labelSelector).toBe('app=nginx');
    });

    it('should handle clearFilters', () => {
      const stateWithFilters: UiState = {
        ...initialState,
        searchTerm: 'test',
        labelSelector: 'app=nginx',
      };
      const action = clearFilters();
      const state = uiReducer(stateWithFilters, action);

      expect(state.searchTerm).toBe('');
      expect(state.labelSelector).toBe('');
    });
  });

  describe('modal actions', () => {
    it('should handle openCreateModal', () => {
      const action = openCreateModal();
      const state = uiReducer(initialState, action);

      expect(state.modalOpen).toBe(true);
      expect(state.modalMode).toBe('create');
      expect(state.editingResourceName).toBeNull();
    });

    it('should handle openEditModal', () => {
      const action = openEditModal({ resourceName: 'my-resource' });
      const state = uiReducer(initialState, action);

      expect(state.modalOpen).toBe(true);
      expect(state.modalMode).toBe('edit');
      expect(state.editingResourceName).toBe('my-resource');
    });

    it('should handle closeModal', () => {
      const openState: UiState = {
        ...initialState,
        modalOpen: true,
        modalMode: 'edit',
        editingResourceName: 'my-resource',
      };
      const action = closeModal();
      const state = uiReducer(openState, action);

      expect(state.modalOpen).toBe(false);
      expect(state.modalMode).toBeNull();
      expect(state.editingResourceName).toBeNull();
    });
  });

  describe('delete confirmation actions', () => {
    it('should handle openDeleteConfirmation', () => {
      const action = openDeleteConfirmation({ resourceName: 'resource-to-delete' });
      const state = uiReducer(initialState, action);

      expect(state.deleteConfirmationOpen).toBe(true);
      expect(state.deletingResourceName).toBe('resource-to-delete');
      expect(state.deletingResourceNamespace).toBeNull();
    });

    it('should handle openDeleteConfirmation with namespace', () => {
      const action = openDeleteConfirmation({
        resourceName: 'resource-to-delete',
        resourceNamespace: 'my-namespace',
      });
      const state = uiReducer(initialState, action);

      expect(state.deleteConfirmationOpen).toBe(true);
      expect(state.deletingResourceName).toBe('resource-to-delete');
      expect(state.deletingResourceNamespace).toBe('my-namespace');
    });

    it('should handle closeDeleteConfirmation', () => {
      const openState: UiState = {
        ...initialState,
        deleteConfirmationOpen: true,
        deletingResourceName: 'resource-to-delete',
        deletingResourceNamespace: 'my-namespace',
      };
      const action = closeDeleteConfirmation();
      const state = uiReducer(openState, action);

      expect(state.deleteConfirmationOpen).toBe(false);
      expect(state.deletingResourceName).toBeNull();
      expect(state.deletingResourceNamespace).toBeNull();
    });
  });

  describe('yaml panel actions', () => {
    it('should handle openYamlPanel', () => {
      const action = openYamlPanel();
      const state = uiReducer(initialState, action);

      expect(state.yamlPanelOpen).toBe(true);
    });

    it('should handle closeYamlPanel', () => {
      const openState: UiState = { ...initialState, yamlPanelOpen: true };
      const action = closeYamlPanel();
      const state = uiReducer(openState, action);

      expect(state.yamlPanelOpen).toBe(false);
    });

    it('should handle toggleYamlPanel - open to close', () => {
      const openState: UiState = { ...initialState, yamlPanelOpen: true };
      const action = toggleYamlPanel();
      const state = uiReducer(openState, action);

      expect(state.yamlPanelOpen).toBe(false);
    });

    it('should handle toggleYamlPanel - close to open', () => {
      const action = toggleYamlPanel();
      const state = uiReducer(initialState, action);

      expect(state.yamlPanelOpen).toBe(true);
    });
  });

  describe('pagination actions', () => {
    it('should handle setPagination', () => {
      const action = setPagination({ page: 3, pageSize: 50 });
      const state = uiReducer(initialState, action);

      expect(state.pagination.page).toBe(3);
      expect(state.pagination.pageSize).toBe(50);
    });
  });

  describe('sort actions', () => {
    it('should handle setSortColumn', () => {
      const action = setSortColumn({ column: 'name', direction: 'desc' });
      const state = uiReducer(initialState, action);

      expect(state.sort.column).toBe('name');
      expect(state.sort.direction).toBe('desc');
    });
  });

  describe('notification actions', () => {
    it('should handle showNotification', () => {
      const action = showNotification({ message: 'Resource created', notificationType: 'success' });
      const state = uiReducer(initialState, action);

      expect(state.notification).toEqual({
        message: 'Resource created',
        type: 'success',
      });
    });

    it('should handle clearNotification', () => {
      const stateWithNotification: UiState = {
        ...initialState,
        notification: { message: 'test', type: 'info' },
      };
      const action = clearNotification();
      const state = uiReducer(stateWithNotification, action);

      expect(state.notification).toBeNull();
    });
  });
});
