import type { Core } from '@strapi/strapi';

import { Services } from '../services';

// @ts-ignore
export interface Strapi extends Core.Strapi {
  plugin: (name: 'mcp') => Omit<Core.Plugin, 'service'> & {
    service: <S extends keyof Services>(name: S) => Services[S];
  };
}

export type StrapiContext = {
  strapi: Strapi;
};
