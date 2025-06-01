import type { Core } from '@strapi/strapi';
import eventsController from './events';

const controllers = {
  events: eventsController,
};

export type Controllers = {
  [K in keyof typeof controllers]: ReturnType<(typeof controllers)[K]>;
};
export default controllers;
