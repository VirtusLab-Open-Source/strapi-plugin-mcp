import contentTypesService from './content-types';
import strapiInfoService from './strapi-info';
import servicesService from './services';

const services = {
  contentTypes: contentTypesService,
  strapiInfo: strapiInfoService,
  services: servicesService,
};

export type Services = {
  [K in keyof typeof services]: ReturnType<(typeof services)[K]>;
};
export default services;
