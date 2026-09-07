import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {

  const router = inject(Router);
  const token = localStorage.getItem('token');

  if (token && token !== 'undefined' && token !== 'null') {
    return true;
  }

  localStorage.removeItem('token');
  return router.parseUrl('/login');
};