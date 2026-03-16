import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { environment } from '../../environments/environment';

export const authGuard: CanActivateFn = () => {
  if (environment.bypassLogin) return true;

  const token = localStorage.getItem('authToken');
  if (token) return true;

  const router = inject(Router);
  router.navigate(['/login']);
  return false;
};
