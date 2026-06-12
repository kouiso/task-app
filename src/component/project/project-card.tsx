'use client';

import { Pencil, Trash2, Users } from 'lucide-react';
import { Badge } from '@/component/ui/badge';
import { Button } from '@/component/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/component/ui/card';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  memberCount: number;
  taskStats: {
    total: number;
    done: number;
  };
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onClick?: (id: string) => void;
  isArchived?: boolean;
}

export function ProjectCard({
  id,
  name,
  description,
  color,
  memberCount,
  taskStats,
  onEdit,
  onDelete,
  onClick,
  isArchived,
}: ProjectCardProps) {
  const progress = taskStats.total > 0 ? (taskStats.done / taskStats.total) * 100 : 0;

  const handleCardClick = () => {
    if (onClick) {
      onClick(id);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(id);
  };

  return (
    <Card
      className={cn('transition-all', onClick && 'cursor-pointer hover:shadow-md')}
      style={{ borderLeft: `4px solid ${color}` }}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="truncate text-lg" title={name}>
          {name}
        </CardTitle>
        {isArchived && (
          <Badge variant="secondary" className="w-fit">
            アーカイブ
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {description && <p className="text-sm text-muted-foreground">{description}</p>}

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>進捗</span>
            <span>
              {taskStats.done} / {taskStats.total} タスク
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline">{memberCount} メンバー</Badge>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={`${name}を編集`}
              onClick={handleEdit}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={`${name}を削除`}
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
