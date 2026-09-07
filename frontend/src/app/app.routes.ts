import { Routes } from '@angular/router';

import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Dashboard } from './pages/dashboard/dashboard';
import { Tasks } from './pages/tasks/tasks';
import { CreateTask } from './pages/create-task/create-task';
import { Profile } from './pages/profile/profile';
import { Interns } from './pages/interns/interns';
import { CreateIntern } from './pages/create-intern/create-intern';
import { TaskDetails } from './pages/task-details/task-details';

import { authGuard } from './guards/auth-guard';
import { managerGuard } from './guards/role-guard';

export const routes: Routes = [

  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  {
    path: 'login',
    component: Login
  },

  {
    path: 'register',
    component: Register
  },

  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [authGuard]
  },

  {
    path: 'tasks',
    component: Tasks,
    canActivate: [authGuard]
  },

  {
    path: 'tasks/:id',
    component: TaskDetails,
    canActivate: [authGuard]
  },

  {
    path: 'create-task',
    component: CreateTask,
    canActivate: [authGuard, managerGuard]
  },

  {
    path: 'interns',
    component: Interns,
    canActivate: [authGuard, managerGuard]
  },

  {
    path: 'create-intern',
    component: CreateIntern,
    canActivate: [authGuard, managerGuard]
  },

  {
    path: 'profile',
    component: Profile,
    canActivate: [authGuard]
  },

  {
    path: '**',
    redirectTo: 'login'
  }

];