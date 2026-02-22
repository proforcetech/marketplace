export interface FieldDefinition {
  type: 'string' | 'integer' | 'decimal' | 'boolean' | 'enum' | 'date';
  options?: string[];
  min?: number;
  max?: number;
  maxLength?: number;
  pattern?: string;
  label: string;
  placeholder?: string;
}

export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  requiredFields: Record<string, FieldDefinition>;
  optionalFields: Record<string, FieldDefinition>;
  sortOrder: number;
  isActive: boolean;
  children?: Category[];
}

export interface CategoryTree extends Category {
  children: CategoryTree[];
}
