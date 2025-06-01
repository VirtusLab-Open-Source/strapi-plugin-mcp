import eventsController from './events.controller';

const controllers = {
  events: eventsController,
};

export type Controllers = {
  [K in keyof typeof controllers]: ReturnType<(typeof controllers)[K]>;
};
export default controllers;
