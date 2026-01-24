'use client';

import { Badge } from '@/component/ui/badge';
import { Button } from '@/component/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/component/ui/card';
import { cn } from '@/lib/utils';
import { Pencil, Trash2, Users } from 'lucide-react';

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
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{name}</CardTitle>
            {isArchived && <Badge variant="secondary">Archived</Badge>}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {description && <p className="text-sm text-muted-foreground">{description}</p>}

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>
              {taskStats.done} / {taskStats.total} tasks
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Badge variant="outline">{memberCount} members</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
