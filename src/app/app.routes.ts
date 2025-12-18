import { Routes } from '@angular/router';
import { LiveSessionComponent } from './components/live-session/live-session';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./components/home/home').then((m) => m.Home) },
  { path: 'live/:id', component: LiveSessionComponent },
];
