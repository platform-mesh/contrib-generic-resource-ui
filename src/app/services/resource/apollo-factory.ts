import { HttpHeaders } from '@angular/common/http';
import { Injectable, NgZone, inject } from '@angular/core';
import {
  type ApolloClientOptions,
  ApolloLink,
  Observable as ApolloObservable,
  FetchResult,
  InMemoryCache,
  Operation,
  split,
} from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { getMainDefinition } from '@apollo/client/utilities';
import { Apollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { print } from 'graphql';
import { Client, ClientOptions, createClient } from 'graphql-sse';
import { ResourceNodeContext } from 'models/index';

class SSELink extends ApolloLink {
  private client: Client;

  constructor(options: ClientOptions) {
    super();
    this.client = createClient(options);
  }

  public override request(operation: Operation): ApolloObservable<FetchResult> {
    return new ApolloObservable((sink) => {
      return this.client.subscribe(
        { ...operation, query: print(operation.query) },
        {
          next: sink.next.bind(sink),
          complete: sink.complete.bind(sink),
          error: sink.error.bind(sink),
        }
      );
    });
  }
}

@Injectable({
  providedIn: 'root',
})
export class ApolloFactory {
  private httpLink = inject(HttpLink);
  private ngZone = inject(NgZone);

  public apollo(
    nodeContext: ResourceNodeContext,
    readFromParentKcpPath = false
  ): Apollo {
    return new Apollo(
      this.ngZone,
      this.createApolloOptions(nodeContext, readFromParentKcpPath)
    );
  }

  private getGatewayUrl(
    nodeContext: ResourceNodeContext,
    readFromParentKcpPath: boolean
  ): string {
    const gatewayUrl = nodeContext.portalContext.crdGatewayApiUrl;

    if (!readFromParentKcpPath) {
      return gatewayUrl;
    }

    // Extract the KCP path from the URL (e.g., root:orgs:sap:workspaces from .../root:orgs:sap:workspaces/graphql)
    const kcpPathMatch = gatewayUrl.match(/\/([^/]+)\/graphql$/);
    if (!kcpPathMatch) {
      return gatewayUrl;
    }

    const currentKcpPath = kcpPathMatch[1];
    // Remove the last segment to get the parent path (e.g., root:orgs:sap:workspaces -> root:orgs:sap)
    const lastColonIndex = currentKcpPath.lastIndexOf(':');
    if (lastColonIndex === -1) {
      return gatewayUrl;
    }

    const parentKcpPath = currentKcpPath.slice(0, lastColonIndex);
    return gatewayUrl.replace(currentKcpPath, parentKcpPath);
  }

  private createApolloOptions(
    nodeContext: ResourceNodeContext,
    readFromParentKcpPath: boolean
  ): ApolloClientOptions {
    const contextLink = setContext(() => {
      return {
        uri: () => this.getGatewayUrl(nodeContext, readFromParentKcpPath),
        headers: new HttpHeaders({
          Authorization: `Bearer ${nodeContext.token}`,
          Accept: 'charset=utf-8',
        }),
      };
    });

    const splitClient = split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === 'OperationDefinition' &&
          definition.operation === 'subscription'
        );
      },
      new SSELink({
        url: () => this.getGatewayUrl(nodeContext, readFromParentKcpPath),
        headers: () => ({
          Authorization: `Bearer ${nodeContext.token}`,
        }),
      }),
      this.httpLink.create({})
    );

    const link = ApolloLink.from([contextLink, splitClient]);
    const cache = new InMemoryCache();

    return {
      link,
      cache,
    };
  }
}
