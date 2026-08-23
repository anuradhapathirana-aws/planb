import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, ShieldOff, ShieldCheck, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RowActions } from '@/components/shared/RowActions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDate, initials, labelizeVisaStatus } from '@/lib/formatters';
import type { Student } from '@/types/student';

interface StudentColumnActions {
  onEdit: (student: Student) => void;
  onToggleBlock: (student: Student) => void;
  onDelete: (student: Student) => void;
}

export function getStudentColumns({ onEdit, onToggleBlock, onDelete }: StudentColumnActions): ColumnDef<Student>[] {
  return [
    {
      id: 'student',
      header: 'Student',
      meta: { sortId: 'student_id' },
      cell: ({ row }) => {
        const student = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="size-9">
              <AvatarImage src={student.profile_photo_url ?? undefined} alt={student.full_name ?? student.student_id} />
              <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                {initials(student.full_name ?? student.student_id)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium">{student.full_name ?? <span className="italic text-muted-foreground">Not registered</span>}</p>
              <p className="truncate text-xs text-muted-foreground">{student.student_id}</p>
            </div>
          </div>
        );
      },
    },
    {
      id: 'email',
      header: 'Email',
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.email ?? '—'}</span>,
    },
    {
      id: 'visa_status',
      header: 'Visa status',
      cell: ({ row }) => <span className="text-sm">{labelizeVisaStatus(row.original.visa_status)}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const student = row.original;
        return (
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={student.is_registered ? 'success' : 'secondary'}>
              {student.is_registered ? 'Registered' : 'Pending'}
            </Badge>
            {student.is_blocked && <Badge variant="destructive">Blocked</Badge>}
          </div>
        );
      },
    },
    {
      id: 'registered_at',
      header: 'Registered',
      meta: { sortId: 'registered_at' },
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.registered_at)}</span>,
    },
    {
      id: 'actions',
      header: '',
      meta: { sticky: 'right' },
      cell: ({ row }) => {
        const student = row.original;
        return (
          <RowActions
            actions={[
              { label: 'Edit', icon: Pencil, onClick: () => onEdit(student) },
              {
                label: student.is_blocked ? 'Unblock' : 'Block',
                icon: student.is_blocked ? ShieldCheck : ShieldOff,
                onClick: () => onToggleBlock(student),
              },
              { label: 'Delete', icon: Trash2, variant: 'destructive', onClick: () => onDelete(student) },
            ]}
          />
        );
      },
    },
  ];
}
