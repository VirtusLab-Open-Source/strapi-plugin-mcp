import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { StrapiContext } from '../@types/strapi';
import z from 'zod';
import { UID } from '@strapi/strapi';
import { omit } from 'lodash';
import fs from 'fs';
import path from 'path';

export default ({ strapi }: StrapiContext) => {
  const contentTypes = Object.keys(strapi.contentTypes) as UID.ContentType[];
  const components = Object.keys(strapi.components);

  return {
    addTools: (server: McpServer) => {
      server.tool('get-content-types', {}, async () => ({
        content: [
          {
            type: 'text',
            text: `Content types:\n${contentTypes.map((name) => `- ${name}`).join('\n')}\n`,
          },
        ],
      }));

      server.tool('get-components', {}, async () => ({
        content: [
          {
            type: 'text',
            text: `Components:\n${components.map((name) => `- ${name}`).join('\n')}\n`,
          },
        ],
      }));

      if (contentTypes.length > 0) {
        server.tool(
          'get-content-type-by-name',
          {
            name: z.enum(contentTypes as [string, ...string[]]),
          },
          async ({ name }) => {
            const schema = strapi.contentType(name as UID.ContentType);
            const attributes = schema.attributes || {};
            const fields = Object.entries(attributes).map(([fieldName, attr]: [string, any]) => {
              const field: Record<string, any> = {
                name: fieldName,
                type: attr.type,
              };
              if ('required' in attr) field.required = !!attr.required;
              if ('unique' in attr) field.unique = !!attr.unique;
              if ('default' in attr) field.default = attr.default;
              if ('enum' in attr) field.enum = attr.enum;
              if ('minLength' in attr) field.minLength = attr.minLength;
              if ('maxLength' in attr) field.maxLength = attr.maxLength;
              if ('min' in attr) field.min = attr.min;
              if ('max' in attr) field.max = attr.max;
              if ('description' in attr) field.description = attr.description;
              // Relations
              if (attr.type === 'relation') {
                if ('relation' in attr) field.relation = attr.relation;
                if ('target' in attr) field.target = attr.target;
                if ('inversedBy' in attr) field.inversedBy = attr.inversedBy;
                if ('mappedBy' in attr) field.mappedBy = attr.mappedBy;
              }
              // Components
              if (attr.type === 'component') {
                if ('component' in attr) field.component = attr.component;
                if ('repeatable' in attr) field.repeatable = !!attr.repeatable;
              }
              // Dynamic zones
              if (attr.type === 'dynamiczone') {
                if ('components' in attr) field.components = attr.components;
              }
              // Custom fields
              if (attr.type === 'customField') {
                if ('customField' in attr) field.customField = attr.customField;
                if ('options' in attr) field.options = attr.options;
              }
              return field;
            });
            // Generate a simple example object
            const example = fields.reduce(
              (acc, field) => {
                switch (field.type) {
                  case 'string':
                  case 'email':
                  case 'password':
                  case 'uid':
                    acc[field.name] = 'example';
                    break;
                  case 'text':
                  case 'richtext':
                    acc[field.name] = 'example text';
                    break;
                  case 'integer':
                  case 'biginteger':
                    acc[field.name] = 1;
                    break;
                  case 'float':
                  case 'decimal':
                    acc[field.name] = 1.23;
                    break;
                  case 'boolean':
                    acc[field.name] = true;
                    break;
                  case 'date':
                  case 'time':
                  case 'datetime':
                  case 'timestamp':
                    acc[field.name] = new Date().toISOString();
                    break;
                  case 'json':
                    acc[field.name] = { key: 'value' };
                    break;
                  case 'enumeration':
                    acc[field.name] = Array.isArray(field.enum) ? field.enum[0] : null;
                    break;
                  case 'relation':
                    acc[field.name] = { documentId: 'related-id' };
                    break;
                  case 'component':
                    acc[field.name] = field.repeatable ? [{ example: true }] : { example: true };
                    break;
                  case 'dynamiczone':
                    acc[field.name] = [];
                    break;
                  case 'media':
                    acc[field.name] = [{ url: 'https://example.com/image.png' }];
                    break;
                  case 'customField':
                    acc[field.name] = 'custom value';
                    break;
                  default:
                    acc[field.name] = null;
                }
                return acc;
              },
              {} as Record<string, any>
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      contentType: name,
                      path: getSchemaFilePath(name) || '',
                      displayName: schema.info?.displayName || name,
                      description: schema.info?.description || '',
                      collectionName: schema.collectionName,
                      fields,
                      example,
                      rawSchema: omit(schema, [
                        '__schema__',
                        'collectionName',
                        'actions',
                        'lifecycles',
                      ]),
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }
        );
      }

      if (components.length > 0) {
        server.tool(
          'get-component-by-name',
          {
            name: z.enum(components as [string, ...string[]]),
          },
          async ({ name }) => {
            const schema = strapi.components[name];
            const attributes = schema.attributes || {};
            const fields = Object.entries(attributes).map(([fieldName, attr]: [string, any]) => {
              const field: Record<string, any> = {
                name: fieldName,
                type: attr.type,
              };
              if ('required' in attr) field.required = !!attr.required;
              if ('unique' in attr) field.unique = !!attr.unique;
              if ('default' in attr) field.default = attr.default;
              if ('enum' in attr) field.enum = attr.enum;
              if ('minLength' in attr) field.minLength = attr.minLength;
              if ('maxLength' in attr) field.maxLength = attr.maxLength;
              if ('min' in attr) field.min = attr.min;
              if ('max' in attr) field.max = attr.max;
              if ('description' in attr) field.description = attr.description;
              // Relations
              if (attr.type === 'relation') {
                if ('relation' in attr) field.relation = attr.relation;
                if ('target' in attr) field.target = attr.target;
                if ('inversedBy' in attr) field.inversedBy = attr.inversedBy;
                if ('mappedBy' in attr) field.mappedBy = attr.mappedBy;
              }
              // Components
              if (attr.type === 'component') {
                if ('component' in attr) field.component = attr.component;
                if ('repeatable' in attr) field.repeatable = !!attr.repeatable;
              }
              // Dynamic zones
              if (attr.type === 'dynamiczone') {
                if ('components' in attr) field.components = attr.components;
              }
              // Custom fields
              if (attr.type === 'customField') {
                if ('customField' in attr) field.customField = attr.customField;
                if ('options' in attr) field.options = attr.options;
              }
              return field;
            });
            // Generate a simple example object
            const example = fields.reduce(
              (acc, field) => {
                switch (field.type) {
                  case 'string':
                  case 'email':
                  case 'password':
                  case 'uid':
                    acc[field.name] = 'example';
                    break;
                  case 'text':
                  case 'richtext':
                    acc[field.name] = 'example text';
                    break;
                  case 'integer':
                  case 'biginteger':
                    acc[field.name] = 1;
                    break;
                  case 'float':
                  case 'decimal':
                    acc[field.name] = 1.23;
                    break;
                  case 'boolean':
                    acc[field.name] = true;
                    break;
                  case 'date':
                  case 'time':
                  case 'datetime':
                  case 'timestamp':
                    acc[field.name] = new Date().toISOString();
                    break;
                  case 'json':
                    acc[field.name] = { key: 'value' };
                    break;
                  case 'enumeration':
                    acc[field.name] = Array.isArray(field.enum) ? field.enum[0] : null;
                    break;
                  case 'relation':
                    acc[field.name] = { documentId: 'related-id' };
                    break;
                  case 'component':
                    acc[field.name] = field.repeatable ? [{ example: true }] : { example: true };
                    break;
                  case 'dynamiczone':
                    acc[field.name] = [];
                    break;
                  case 'media':
                    acc[field.name] = [{ url: 'https://example.com/image.png' }];
                    break;
                  case 'customField':
                    acc[field.name] = 'custom value';
                    break;
                  default:
                    acc[field.name] = null;
                }
                return acc;
              },
              {} as Record<string, any>
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      component: name,
                      path: getComponentSchemaFilePath(name) || '',
                      displayName: schema.info?.displayName || name,
                      description: schema.info?.description || '',
                      category: schema.category,
                      fields,
                      example,
                      rawSchema: omit(schema, ['__schema__', 'category', 'actions', 'lifecycles']),
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }
        );
      }
    },
  };
};

// Helper to build the schema.json file path for a given UID (api or plugin content types)
export function getSchemaFilePath(uid: string): string | null {
  const extensions = ['schema.json', 'schema.js', 'schema.ts', 'index.js', 'index.ts'];

  if (uid.startsWith('api::')) {
    const [apiName, contentTypeName] = uid.replace('api::', '').split('.');
    const basePath = `src/api/${apiName}/content-types/${contentTypeName}`;

    // Check all possible extensions
    for (const ext of extensions) {
      const schemaPath = `${basePath}/${ext}`;
      try {
        if (fs.existsSync(path.resolve(process.cwd(), schemaPath))) {
          return schemaPath;
        }
      } catch (error) {
        console.warn(
          `Could not check schema file existence for ${uid} with extension ${ext}:`,
          error
        );
      }
    }

    return null;
  }

  if (uid.startsWith('plugin::')) {
    const [pluginName, contentTypeName] = uid.replace('plugin::', '').split('.');

    const basePaths = [
      `src/plugins/${pluginName}/content-types/${contentTypeName}`,
      `node_modules/strapi-plugin-${pluginName}/content-types/${contentTypeName}`,
      `node_modules/${pluginName}/content-types/${contentTypeName}`,
    ];

    // Check each base path with all extensions
    for (const basePath of basePaths) {
      for (const ext of extensions) {
        const schemaPath = `${basePath}/${ext}`;
        try {
          if (fs.existsSync(path.resolve(process.cwd(), schemaPath))) {
            return schemaPath;
          }
        } catch (error) {
          console.warn(`Could not check plugin schema file for ${uid} at ${schemaPath}:`, error);
        }
      }
    }

    return null;
  }

  return null;
}

// Helper to build the schema.json file path for a given component
export function getComponentSchemaFilePath(name: string): string | null {
  const extensions = ['schema.json', 'schema.js', 'schema.ts', 'index.js', 'index.ts'];

  // Components follow the pattern: category.componentName
  // e.g., "units.file-data" -> src/components/units/file-data/
  const [category, componentName] = name.split('.');

  if (!category || !componentName) {
    console.warn(`Invalid component name format: ${name}. Expected format: category.componentName`);
    return null;
  }

  const basePath = `src/components/${category}/${componentName}`;

  // Check all possible extensions
  for (const ext of extensions) {
    const schemaPath = `${basePath}/${ext}`;
    try {
      if (fs.existsSync(path.resolve(process.cwd(), schemaPath))) {
        return schemaPath;
      }
    } catch (error) {
      console.warn(`Could not check component schema file for ${name} at ${schemaPath}:`, error);
    }
  }

  return null;
}
