import { CallToolResult } from '@modelcontextprotocol/sdk/types';
import { Schema, UID } from '@strapi/strapi';
import fs from 'fs';
import { omit } from 'lodash';
import path from 'path';
import { ZodOptional, ZodString, z } from 'zod';

import { Strapi } from '@local-types/strapi';

import { McpToolDefinitionBuilder } from '../../../common';
import { processAttribute } from './common';

export const getContentTypeByNameTool: McpToolDefinitionBuilder<{
  name: ZodString;
  plugin: ZodOptional<ZodString>;
}> = (strapi: Strapi) => {
  const contentTypes = new Set(Object.keys(strapi.contentTypes) as UID.ContentType[]);

  return {
    name: 'get-content-type-by-name',
    argsSchema: {
      name: z.string(),
      plugin: z.string().optional(),
    },
    callback: async ({ name, plugin }) => {
      if (contentTypes.has(name as UID.ContentType)) {
        return mapToResult({
          schema: strapi.contentTypes[name as UID.ContentType],
          name,
          isSure: true,
        });
      }

      if (plugin && contentTypes.has(`plugin::${plugin}.${name}` as UID.ContentType)) {
        const pluginName = `plugin::${plugin}.${name}` as UID.ContentType;

        return mapToResult({
          schema: strapi.contentTypes[pluginName],
          name: pluginName,
          isSure: true,
        });
      }

      const similar = Array.from(contentTypes).filter((contentType) => contentType.includes(name));

      if (similar.length > 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'Content type not found',
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
              error: 'Content type not found',
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
  schema: Schema.ContentTypes[UID.ContentType];
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
            path: getSchemaFilePath(name) || '',
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

// This is AI generated
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
