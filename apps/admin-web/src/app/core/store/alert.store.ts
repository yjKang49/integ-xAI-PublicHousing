// apps/admin-web/src/app/core/store/alert.store.ts
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { environment } from '../../../environments/environment';

interface AlertStoreState {
  activeCount: number;
  lastFetchedAt: string | null;
}

const initialState: AlertStoreState = {
  activeCount: 0,
  lastFetchedAt: null,
};

export const AlertStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => {
    const http = inject(HttpClient);

    return {
      refresh() {
        http
          .get<{ data: unknown[]; meta: { hasNext: boolean } }>(`${environment.apiUrl}/alerts?status=ACTIVE&limit=99`)
          .subscribe({
            next: (res) =>
              patchState(store, {
                activeCount: Array.isArray(res?.data) ? res.data.length : 0,
                lastFetchedAt: new Date().toISOString(),
              }),
            error: () => { /* silent — badge just shows 0 */ },
          });
      },
      decrement() {
        patchState(store, { activeCount: Math.max(0, store.activeCount() - 1) });
      },
      reset() {
        patchState(store, initialState);
      },
    };
  }),
);
