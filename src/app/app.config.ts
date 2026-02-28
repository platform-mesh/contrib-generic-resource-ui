import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { contextReducer } from './state/context/context.reducer';
import { ContextEffects } from './state/context/context.effects';
import { resourcesReducer } from './state/resources/resources.reducer';
import { ResourcesEffects } from './state/resources/resources.effects';
import { schemaReducer } from './state/schema/schema.reducer';
import { SchemaEffects } from './state/schema/schema.effects';
import { uiReducer } from './state/ui/ui.reducer';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  ApplicationConfig,
  importProvidersFrom,
  isDevMode,
} from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, withHashLocation } from '@angular/router';
import {
  ContentDensityMode,
  ContentDensityService,
  RtlService,
  provideContentDensity,
  provideMessageToastConfig,
  provideTheming,
} from '@fundamental-ngx/core';
import { provideDialogService } from '@fundamental-ngx/core/dialog';
import { MessageToastService } from '@fundamental-ngx/core/message-toast';
import {
  LuigiAngularSupportModule,
  LuigiContextServiceImpl,
} from '@luigi-project/client-support-angular';
import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideNamedApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';

export interface AppState {
  context: ReturnType<typeof contextReducer>;
  schema: ReturnType<typeof schemaReducer>;
  resources: ReturnType<typeof resourcesReducer>;
  ui: ReturnType<typeof uiReducer>;
}

export const appConfig: ApplicationConfig = {
  providers: [
    ContentDensityService,
    RtlService,
    LuigiContextServiceImpl,
    HttpLink,
    MessageToastService,

    importProvidersFrom(LuigiAngularSupportModule),

    provideNamedApollo(() => ({})),

    provideRouter(routes, withHashLocation()),

    provideContentDensity({
      storage: 'memory',
      defaultGlobalContentDensity: ContentDensityMode.COMPACT,
    }),
    provideMessageToastConfig({}),
    provideTheming({ themeQueryParam: 'sap-theme', defaultTheme: 'sap_horizon' }),
    provideDialogService(),

    provideStore<AppState>({
      context: contextReducer,
      schema: schemaReducer,
      resources: resourcesReducer,
      ui: uiReducer,
    }),
    provideEffects([
      ContextEffects,
      SchemaEffects,
      ResourcesEffects,
    ]),
    provideStoreDevtools({
      maxAge: 25,
      logOnly: !isDevMode(),
    }),

    provideHttpClient(withInterceptorsFromDi()),
    provideNoopAnimations(),

    { provide: 'ENV', useValue: environment },
  ],
};
