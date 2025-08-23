// This is AI generated
export function processAttribute([fieldName, attr]: [string, any]) {
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
}
