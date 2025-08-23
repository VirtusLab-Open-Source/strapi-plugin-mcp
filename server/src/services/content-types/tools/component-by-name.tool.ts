import { CallToolResult } from '@modelcontextprotocol/sdk/types';
import { Schema, UID } from '@strapi/strapi';
import fs from 'fs';
import { omit } from 'lodash';
import path from 'path';
import { ZodOptional, ZodString, z } from 'zod';

import { Strapi } from '@local-types/strapi';

import { McpToolDefinitionBuilder } from '../../../common';
import { processAttribute } from './common';

export const getComponentByNameTool: McpToolDefinitionBuilder<{
  name: ZodString;
  category: ZodOptional<ZodString>;
}> = (strapi: Strapi) => {
  const components = new Set(Object.keys(strapi.components) as UID.Component[]);

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
        });
      }

      if (category && components.has(`${category}.${name}` as UID.Component)) {
        return mapToResult({
          schema: strapi.components[`${category}.${name}` as UID.Component],
          name: `${category}.${name}`,
          isSure: true,
        });
      }

      const similar = Array.from(components).filter((component) => component.includes(name));

      if (similar.length > 0) {
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
    },
  };
};

export function mapToResult({
  name,
  schema,
  isSure,
}: {
  schema: Schema.Components[UID.Component];
  name: string;
  isSure: boolean;
}) {
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
            path: getComponentSchemaFilePath(name) || '',
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
