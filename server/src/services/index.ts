import contentTypesService from './contentTypes.service';
import strapiInfoService from './strapiInfo.service';

const services = {
  contentTypes: contentTypesService,
  strapiInfo: strapiInfoService,
};

export type Services = {
  [K in keyof typeof services]: ReturnType<(typeof services)[K]>;
};
export default services;
