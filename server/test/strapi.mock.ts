import { Strapi } from '../src/@types/strapi';

export const createStrapiMock = ({
  contentTypes: contentTypesKeys = [],
  components: componentsKeys = [],
  services: servicesKeys = [],
}: {
  contentTypes?: string[];
  components?: string[];
  services?: string[];
}) => {
  const contentTypes: Record<string, unknown> = {};
  const components: Record<string, unknown> = {};
  const services: Record<string, unknown> = {};

  for (const key of contentTypesKeys) {
    contentTypes[key] = {};
  }

  for (const key of componentsKeys) {
    components[key] = {};
  }

  for (const key of servicesKeys) {
    services[key] = {};
  }

  return { contentTypes, components, services } as unknown as Strapi;
};
