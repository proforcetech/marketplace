'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '../lib/cn.js';
import { Button } from './Button.js';
import { Input } from './Input.js';
import { Select } from './Select.js';
import { Tag } from './Tag.js';
import type { ItemCondition, SearchSortBy, CategoryTree } from '@marketplace/shared';

export interface FilterValues {
  category?: string;
  priceMin?: number;
  priceMax?: number;
  conditions: ItemCondition[];
  postedWithin?: string;
  sortBy: SearchSortBy;
}

export interface FilterSidebarProps {
  /** Current filter values. */
  values: FilterValues;
  /** Called when any filter changes. */
  onChange: (values: FilterValues) => void;
  /** Called when "Apply" is clicked (mobile). */
  onApply?: () => void;
  /** Called to clear all filters. */
  onClear: () => void;
  /** Category tree data. */
  categories?: CategoryTree[];
  /** Whether to render as a mobile bottom sheet. */
  isMobile?: boolean;
  /** Whether the sidebar is open (for mobile sheet). */
  isOpen?: boolean;
  /** Called to close the mobile sheet. */
  onClose?: () => void;
  className?: string;
}

const CONDITIONS: { value: ItemCondition; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'For Parts' },
];

const POSTED_OPTIONS = [
  { value: '', label: 'Any time' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

const SORT_OPTIONS = [
  { value: 'distance', label: 'Distance' },
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}): JSX.Element {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-neutral-200 py-4 last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-heading-sm text-neutral-800"
        aria-expanded={isOpen}
      >
        {title}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn('transition-transform duration-fast', isOpen && 'rotate-180')}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isOpen && <div className="mt-3">{children}</div>}
    </div>
  );
}

function CategoryTreeItem({
  category,
  selectedSlug,
  onSelect,
  depth = 0,
}: {
  category: CategoryTree;
  selectedSlug?: string;
  onSelect: (slug: string) => void;
  depth?: number;
}): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = category.children.length > 0;
  const isSelected = selectedSlug === category.slug;

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          onSelect(category.slug);
          if (hasChildren) setExpanded(!expanded);
        }}
        className={cn(
          'flex w-full items-center gap-2 py-1.5 text-body-sm transition-colors duration-fast rounded-md px-2 -mx-2',
          isSelected
            ? 'bg-primary-50 text-primary-700 font-medium'
            : 'text-neutral-700 hover:bg-neutral-50',
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren && (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={cn('shrink-0 transition-transform duration-fast', expanded && 'rotate-90')}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )}
        <span className={cn(!hasChildren && 'ml-5')}>{category.name}</span>
      </button>
      {expanded &&
        hasChildren &&
        category.children.map((child) => (
          <CategoryTreeItem
            key={child.id}
            category={child}
            selectedSlug={selectedSlug}
            onSelect={onSelect}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}

function FilterContent({
  values,
  onChange,
  categories,
}: {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  categories?: CategoryTree[];
}): JSX.Element {
  const toggleCondition = (condition: ItemCondition): void => {
    const current = values.conditions;
    const next = current.includes(condition)
      ? current.filter((c) => c !== condition)
      : [...current, condition];
    onChange({ ...values, conditions: next });
  };

  return (
    <div>
      {/* Sort by */}
      <FilterSection title="Sort By">
        <Select
          options={SORT_OPTIONS}
          value={values.sortBy}
          onChange={(e) => onChange({ ...values, sortBy: e.target.value as SearchSortBy })}
          selectSize="sm"
        />
      </FilterSection>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <FilterSection title="Category">
          <div className="max-h-60 overflow-y-auto">
            {categories.map((cat) => (
              <CategoryTreeItem
                key={cat.id}
                category={cat}
                selectedSlug={values.category}
                onSelect={(slug) =>
                  onChange({ ...values, category: values.category === slug ? undefined : slug })
                }
              />
            ))}
          </div>
        </FilterSection>
      )}

      {/* Price range */}
      <FilterSection title="Price Range">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min"
            inputSize="sm"
            value={values.priceMin ?? ''}
            onChange={(e) =>
              onChange({ ...values, priceMin: e.target.value ? Number(e.target.value) : undefined })
            }
            leftIcon={<span className="text-caption text-neutral-500">$</span>}
          />
          <span className="text-neutral-400">-</span>
          <Input
            type="number"
            placeholder="Max"
            inputSize="sm"
            value={values.priceMax ?? ''}
            onChange={(e) =>
              onChange({ ...values, priceMax: e.target.value ? Number(e.target.value) : undefined })
            }
            leftIcon={<span className="text-caption text-neutral-500">$</span>}
          />
        </div>
      </FilterSection>

      {/* Condition */}
      <FilterSection title="Condition">
        <div className="flex flex-wrap gap-2">
          {CONDITIONS.map(({ value, label }) => (
            <Tag
              key={value}
              selected={values.conditions.includes(value)}
              onClick={() => toggleCondition(value)}
            >
              {label}
            </Tag>
          ))}
        </div>
      </FilterSection>

      {/* Posted within */}
      <FilterSection title="Posted Within">
        <div className="flex flex-wrap gap-2">
          {POSTED_OPTIONS.map(({ value, label }) => (
            <Tag
              key={value}
              selected={values.postedWithin === value}
              onClick={() => onChange({ ...values, postedWithin: value || undefined })}
            >
              {label}
            </Tag>
          ))}
        </div>
      </FilterSection>
    </div>
  );
}

export function FilterSidebar({
  values,
  onChange,
  onApply,
  onClear,
  categories,
  isMobile = false,
  isOpen = true,
  onClose,
  className,
}: FilterSidebarProps): JSX.Element | null {
  if (isMobile) {
    if (!isOpen) return null;

    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-overlay bg-neutral-950/50 animate-fade-in-up"
          onClick={onClose}
        />
        {/* Bottom sheet */}
        <div className="fixed bottom-0 left-0 right-0 z-overlay bg-white rounded-t-xl shadow-lg animate-slide-in-bottom max-h-[70dvh] flex flex-col">
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-8 h-1 rounded-full bg-neutral-300" />
          </div>
          <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-200">
            <h2 className="text-heading-md text-neutral-900">Filters</h2>
            <button
              type="button"
              onClick={onClear}
              className="text-body-sm text-primary-500 hover:text-primary-600"
            >
              Clear all
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4">
            <FilterContent values={values} onChange={onChange} categories={categories} />
          </div>
          <div className="px-4 py-3 border-t border-neutral-200 pb-safe">
            <Button
              variant="primary"
              fullWidth
              onClick={() => {
                onApply?.();
                onClose?.();
              }}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <aside className={cn('w-[280px] shrink-0', className)}>
      <div className="sticky top-20">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-heading-sm text-neutral-900">Filters</h2>
          <button
            type="button"
            onClick={onClear}
            className="text-body-sm text-primary-500 hover:text-primary-600 transition-colors duration-fast"
          >
            Clear all
          </button>
        </div>
        <FilterContent values={values} onChange={onChange} categories={categories} />
      </div>
    </aside>
  );
}
