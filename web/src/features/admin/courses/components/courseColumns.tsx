import type { ColumnDef } from '@tanstack/react-table';
import { ClipboardList, Eye, EyeOff, Layers, Pencil, Trash2, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RowActions } from '@/components/shared/RowActions';
import { formatDate } from '@/lib/formatters';
import type { CourseProgramme } from '@shared/types/course';

interface CourseColumnActions {
  onEdit: (programme: CourseProgramme) => void;
  onEditPaper: (programme: CourseProgramme) => void;
  onTogglePublished: (programme: CourseProgramme) => void;
  onDelete: (programme: CourseProgramme) => void;
}

export function getCourseColumns({
  onEdit,
  onEditPaper,
  onTogglePublished,
  onDelete,
}: CourseColumnActions): ColumnDef<CourseProgramme>[] {
  return [
    {
      id: 'name',
      header: 'Course programme',
      meta: { sortId: 'name' },
      cell: ({ row }) => (
        <div className="min-w-0">
          <span className="font-medium">{row.original.name}</span>
          {row.original.description && (
            <p className="line-clamp-1 text-xs text-muted-foreground" title={row.original.description}>
              {row.original.description}
            </p>
          )}
        </div>
      ),
    },
    {
      id: 'category',
      header: 'Category',
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.category?.name ?? '—'}</span>,
    },
    {
      id: 'content',
      header: 'Content',
      cell: ({ row }) => (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1" title="Topics">
            <Layers className="size-3.5" aria-hidden="true" />
            {row.original.topics_count ?? 0}
          </span>
          <span className="flex items-center gap-1" title="Videos">
            <Video className="size-3.5" aria-hidden="true" />
            {row.original.videos_count ?? 0}
          </span>
        </div>
      ),
    },
    {
      id: 'paper',
      header: 'Q&A paper',
      cell: ({ row }) => {
        const paper = row.original.paper;

        if (!paper) return <span className="text-sm text-muted-foreground">—</span>;

        return (
          <span
            className="flex items-center gap-1 text-sm text-muted-foreground"
            title={`${paper.title} · ${paper.pass_mark}% to pass`}
          >
            <ClipboardList className="size-3.5" aria-hidden="true" />
            {paper.questions_count ?? 0} Q
          </span>
        );
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'published' ? 'success' : 'secondary'}>
          {row.original.status === 'published' ? 'Published' : 'Draft'}
        </Badge>
      ),
    },
    {
      id: 'created_at',
      header: 'Created',
      meta: { sortId: 'created_at' },
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.created_at)}</span>,
    },
    {
      id: 'actions',
      header: '',
      meta: { sticky: 'right' },
      cell: ({ row }) => {
        const programme = row.original;
        const isPublished = programme.status === 'published';

        return (
          <RowActions
            actions={[
              { label: 'Edit', icon: Pencil, onClick: () => onEdit(programme) },
              { label: 'Q&A paper', icon: ClipboardList, onClick: () => onEditPaper(programme) },
              {
                label: isPublished ? 'Move to draft' : 'Publish',
                icon: isPublished ? EyeOff : Eye,
                onClick: () => onTogglePublished(programme),
              },
              {
                label: 'Delete',
                icon: Trash2,
                variant: 'destructive',
                onClick: () => onDelete(programme),
              },
            ]}
          />
        );
      },
    },
  ];
}
