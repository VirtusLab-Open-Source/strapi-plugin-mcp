/**
 * Plugin server methods
 */
import controllers from './controllers';
import policies from './policies';
import routes from './routes';
import services from './services';

export default {
  controllers,
  policies,
  routes,
  services,
} as const;
