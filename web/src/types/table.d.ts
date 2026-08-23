import '@tanstack/react-table';

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData, TValue> {
    sortId?: string;
    /** Pins this column to the right edge during horizontal scroll — use on a trailing row-actions column. */
    sticky?: 'right';
  }
}
