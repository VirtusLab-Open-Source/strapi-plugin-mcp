import { CallToolResult } from '@modelcontextprotocol/sdk/types';
import { Schema, UID } from '@strapi/strapi';
import fs from 'fs';
import { omit } from 'lodash';
import path from 'path';
import { ZodOptional, ZodString, z } from 'zod';

import { Strapi } from '@local-types/strapi';

import { McpToolDefinitionBuilder } from '../../../common';
import { Logger, buildLogger } from '../../../utils';
import { processAttribute } from './common';

export const getComponentByNameTool: McpToolDefinitionBuilder<{
  name: ZodString;
  category: ZodOptional<ZodString>;
}> = (strapi: Strapi) => {
  const components = new Set(Object.keys(strapi.components) as UID.Component[]);
  const logger = buildLogger(strapi);

  return {
    name: 'get-component-by-name',
    argsSchema: {
      name: z.string(),
      category: z.string().optional(),
    },
    callback: async ({ name, category }) => {
      if (components.has(name as UID.Component)) {
        return mapToResult({
          schema: strapi.components[name as UID.Component],
          name,
          isSure: true,
          logger,
        });
      }

      if (category && components.has(`${category}.${name}` as UID.Component)) {
        return mapToResult({
          schema: strapi.components[`${category}.${name}` as UID.Component],
          name: `${category}.${name}`,
          isSure: true,
          logger,
        });
      }

      const similar = Array.from(components).filter((component) => component.includes(name));

      if (similar.length > 0) {
        logger.warn(`Component not found: ${name}, similar: ${similar.join(', ')}`);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'Component not found',
                suggestions: similar,
              }),
            },
          ],
        } satisfies CallToolResult;
      }

      logger.warn(`Component not found: "${name}"`);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: 'Component not found',
              suggestions: [],
            }),
          },
        ],
      } satisfies CallToolResult;
    },
  };
};

interface MapToResultParams {
  schema: Schema.Components[UID.Component];
  name: string;
  isSure: boolean;
  logger: Logger;
}

export function mapToResult({ name, schema, isSure, logger }: MapToResultParams) {
  const attributes = schema.attributes || {};
  const fields = Object.entries(attributes).map(processAttribute);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          isSure,
          contentType: {
            contentType: name,
            path: getComponentSchemaFilePath({ name, logger }) || '',
            displayName: schema.info?.displayName || name,
            description: schema.info?.description || '',
            collectionName: schema.collectionName,
            fields,
            // example,
            rawSchema: omit(schema, ['__schema__', 'collectionName', 'actions', 'lifecycles']),
          },
        }),
      },
    ],
  } satisfies CallToolResult;
}

interface GetComponentSchemaFilePathParams {
  name: string;
  logger: Logger;
}

export function getComponentSchemaFilePath({
  name,
  logger,
}: GetComponentSchemaFilePathParams): string | null {
  const extensions = ['schema.json', 'schema.js', 'schema.ts', 'index.js', 'index.ts'];

  // Components follow the pattern: category.componentName
  // e.g., "units.file-data" -> src/components/units/file-data/
  const [category, componentName] = name.split('.');

  if (!category || !componentName) {
    logger.warn(`Invalid component name format: ${name}. Expected format: category.componentName`);
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
      logger.warn(`Could not check component schema file for ${name} at ${schemaPath}:`);
    }
  }

  return null;
}
