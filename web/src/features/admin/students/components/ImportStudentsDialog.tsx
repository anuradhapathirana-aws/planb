import { useRef, useState } from 'react';
import { CheckCircle2, FileUp, Loader2, TriangleAlert, UploadCloud } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useImportStudents } from '@/features/admin/students/hooks/useStudents';
import type { ImportResult } from '@/types/student';
import { cn } from '@/lib/utils';

interface ImportStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportStudentsDialog({ open, onOpenChange }: ImportStudentsDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const importStudents = useImportStudents();

  const reset = () => {
    setFile(null);
    setResult(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleImport = () => {
    if (!file) return;
    importStudents.mutate(file, {
      onSuccess: (data) => setResult(data),
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import student IDs</DialogTitle>
          <DialogDescription>
            Upload a CSV with a <code className="rounded bg-muted px-1 py-0.5 text-xs">student_id</code> column
            (optionally <code className="rounded bg-muted px-1 py-0.5 text-xs">full_name</code>,{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">email</code>,{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">contact_number</code>) so candidates can
            self-register on the mobile app.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) setFile(dropped);
              }}
              onClick={() => inputRef.current?.click()}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors',
                isDragging ? 'border-primary bg-secondary' : 'border-input hover:bg-secondary/50',
              )}
            >
              {file ? (
                <>
                  <FileUp className="size-8 text-primary" />
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB — click to change</p>
                </>
              ) : (
                <>
                  <UploadCloud className="size-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Click to select or drag a CSV file here</p>
                  <p className="text-xs text-muted-foreground">.csv up to 2 MB</p>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-success/10 p-3">
                <p className="text-2xl font-semibold text-success">{result.imported}</p>
                <p className="text-xs text-muted-foreground">Imported</p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-2xl font-semibold">{result.skipped}</p>
                <p className="text-xs text-muted-foreground">Skipped (existing)</p>
              </div>
              <div className="rounded-lg bg-destructive/10 p-3">
                <p className="text-2xl font-semibold text-destructive">{result.failed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
                {result.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                    <span>
                      Row {err.row}
                      {err.student_id ? ` (${err.student_id})` : ''}: {err.message}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {result.failed === 0 && (
              <div className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="size-4" />
                All rows processed successfully.
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <>
              <Button type="button" size="sm" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleImport} disabled={!file || importStudents.isPending}>
                {importStudents.isPending && <Loader2 className="size-3.5 animate-spin" />}
                Import
              </Button>
            </>
          ) : (
            <>
              <Button type="button" size="sm" variant="outline" onClick={reset}>
                Import another file
              </Button>
              <Button type="button" size="sm" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
