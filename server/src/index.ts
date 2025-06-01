/**
 * Plugin server methods
 */
import controllers from './controllers';
import routes from './routes';
import services from './services';

export default {
  controllers,
  routes,
  services,
} as const;
